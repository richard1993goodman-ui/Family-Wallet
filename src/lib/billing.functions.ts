import { createServerFn } from "@tanstack/react-start";

import { isInterval, isPlan, intervalsFor, priceLookupKey, type Interval, type PlanId } from "./billing.config";
import type { Provisioned } from "./billing.server";
import { siteUrl } from "./site";
import type { StripeEnv } from "./stripe";

type CheckoutResult = { clientSecret: string } | { error: string };

/**
 * Starts an embedded Stripe checkout for one of the two self-serve plans.
 * The Stripe SDK is loaded inside the handler so it never reaches the browser bundle.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: { plan: unknown; interval: unknown; environment: unknown; slug?: unknown }) => {
    if (!isPlan(data.plan)) throw new Error("Unknown plan.");
    if (!isInterval(data.interval)) throw new Error("Unknown billing period.");
    // Agency plans are monthly only, so a yearly request never reaches Stripe.
    if (!intervalsFor(data.plan).includes(data.interval))
      throw new Error("That plan is not billed that way.");
    if (data.environment !== "sandbox" && data.environment !== "live")
      throw new Error("Unknown payment environment.");
    return {
      plan: data.plan as PlanId,
      interval: data.interval as Interval,
      environment: data.environment as StripeEnv,
      slug: typeof data.slug === "string" && /^[a-z0-9-]{1,40}$/.test(data.slug) ? data.slug : null,
    };
  })
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    // From inside a wallet: only an unlocked parent may pay, and only for the Family plan.
    let family: { id: string; email: string | null } | null = null;
    if (data.slug) {
      if (data.plan !== "family") return { error: "Choose the Family plan." };
      const { requireFamily } = await import("./family.server");
      const found = await requireFamily(data.slug);
      if (!found) return { error: "Please open your wallet as a parent first." };
      const { billingSummary } = await import("./billing.server");
      const summary = await billingSummary(found.id);
      if (summary.subscription?.live) return { error: "You already have a plan. Use Manage billing to change it." };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row } = await supabaseAdmin.from("families").select("contact_email").eq("id", found.id).maybeSingle();
      family = { id: found.id, email: row?.contact_email ?? null };
    }
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({
        lookup_keys: [priceLookupKey(data.plan, data.interval)],
        active: true,
      });
      const price = prices.data[0];
      if (!price) {
        return {
          error: `No price found for the ${data.plan} plan billed ${data.interval}ly. Check the plan was created in this payment environment.`,
        };
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: price.id, quantity: 1 }],
        ui_mode: "embedded_page",
        return_url: data.slug
          ? `${siteUrl(`/billing/${data.slug}`)}?session_id={CHECKOUT_SESSION_ID}`
          : `${siteUrl("/subscribed")}?session_id={CHECKOUT_SESSION_ID}`,
        ...(family?.email ? { customer_email: family.email } : {}),
        // Lovable's Stripe connection takes care of tax, fraud, disputes and transaction
        // support for buyers in the countries it covers; elsewhere it still collects tax.
        managed_payments: { enabled: true },
        billing_address_collection: "required",
        allow_promotion_codes: true,
        metadata: { app: "family_wallet", plan: data.plan, interval: data.interval, ...(family ? { family_id: family.id } : {}) },
        subscription_data: { metadata: { plan: data.plan, interval: data.interval, ...(family ? { family_id: family.id } : {}) } },
      } as Parameters<typeof stripe.checkout.sessions.create>[0]);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const claimSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; environment: unknown }) => {
    if (data.environment !== "sandbox" && data.environment !== "live")
      throw new Error("Unknown payment environment.");
    return { sessionId: data.sessionId, environment: data.environment as StripeEnv };
  })
  .handler(async ({ data }): Promise<(Provisioned & { emailing: boolean }) | (Extract<Provisioned, { kind: "agency" }> & { setupLink: string | null; emailing: boolean })> => {
    const { provisionFromSession } = await import("./billing.server");
    const { markUnlocked } = await import("./wallet.server");
    const { emailConfigured } = await import("./email.server");
    const result = await provisionFromSession(data.sessionId, data.environment);
    // Payment is verified with Stripe above, so the family goes straight in. An agency
    // account has no wallet to unlock; its login is set up by the account owner.
    if (result.status === "ready" && result.kind === "family") {
      await markUnlocked(result.slug);
    }
    const emailing = emailConfigured();
    // Built per case so the shape the page reads stays exactly the one it narrows on.
    if (result.status === "pending") return { status: "pending" as const, emailing };
    if (result.kind === "agency") {
      const { agencyOwnerSetupLink } = await import("./billing.server");
      const setupLink = await agencyOwnerSetupLink(data.sessionId).catch(() => null);
      return {
        status: "ready" as const,
        kind: "agency" as const,
        agencyName: result.agencyName,
        allowance: result.allowance,
        plan: result.plan,
        setupLink,
        emailing,
      };
    }
    return {
      status: "ready" as const,
      kind: "family" as const,
      slug: result.slug,
      code: result.code,
      familyName: result.familyName,
      plan: result.plan,
      emailing,
    };
  });

/** "Send me my details again". Replies the same way whether or not the address has a wallet. */
export const requestWalletDetails = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { sendWalletDetails } = await import("./billing.server");
    let client = "unknown";
    try {
      const request = getRequest();
      const forwarded = request.headers.get("x-forwarded-for") ?? "";
      client = (forwarded.split(",")[0] || request.headers.get("cf-connecting-ip") || "unknown").trim();
    } catch {
      // No request context: fall back to a shared bucket, which only makes the limit stricter.
    }
    await sendWalletDetails(String(data.email ?? ""), client);
    return { ok: true as const };
  });

/** The family's own continuation status: only for a device that holds the wallet's access code. */
export const getContinuationFn = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { continuationFor } = await import("./wallet.server");
    return continuationFor(String(data.slug ?? ""));
  });

/**
 * Checkout for a family that is leaving agency funding (or came back after suspension). It pays for
 * the family's EXISTING wallet: the session carries the family id, and nothing is created or copied.
 */
export const createContinueCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; plan: unknown; interval: unknown; environment: unknown }) => {
    if (data.plan !== "family") throw new Error("Unknown plan.");
    if (!isInterval(data.interval)) throw new Error("Unknown billing period.");
    if (data.environment !== "sandbox" && data.environment !== "live") throw new Error("Unknown payment environment.");
    return { slug: String(data.slug ?? ""), plan: data.plan as PlanId, interval: data.interval as Interval, environment: data.environment as StripeEnv };
  })
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const { continuationFor } = await import("./wallet.server");
    const state = await continuationFor(data.slug);
    if (!state || (state.state !== "transition" && state.state !== "suspended")) {
      return { error: "This wallet can't be continued from here." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: family } = await supabaseAdmin.from("families").select("id, contact_email").eq("slug", data.slug).maybeSingle();
    if (!family) return { error: "Wallet not found." };

    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [priceLookupKey(data.plan, data.interval)], active: true });
      const price = prices.data[0];
      if (!price) return { error: "That plan isn't available right now." };
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: price.id, quantity: 1 }],
        ui_mode: "embedded_page",
        return_url: `${siteUrl("/subscribed")}?session_id={CHECKOUT_SESSION_ID}`,
        managed_payments: { enabled: true },
        billing_address_collection: "required",
        allow_promotion_codes: true,
        ...(family.contact_email ? { customer_email: family.contact_email } : {}),
        metadata: { app: "family_wallet", plan: data.plan, interval: data.interval, family_id: family.id },
        subscription_data: { metadata: { plan: data.plan, interval: data.interval, family_id: family.id } },
      } as Parameters<typeof stripe.checkout.sessions.create>[0]);
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Plan & billing page data. Parents only; carers get null. */
export const getBillingFn = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { requireFamily } = await import("./family.server");
    const family = await requireFamily(data.slug);
    if (!family) return null;
    const { billingSummary } = await import("./billing.server");
    return billingSummary(family.id);
  });

/** Records an in-wallet payment straight away when Stripe sends the parent back. */
export const confirmWalletPaymentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; sessionId: string; environment: unknown }) => {
    if (data.environment !== "sandbox" && data.environment !== "live") throw new Error("Unknown payment environment.");
    return { slug: data.slug, sessionId: data.sessionId, environment: data.environment as StripeEnv };
  })
  .handler(async ({ data }) => {
    const { requireFamily } = await import("./family.server");
    const family = await requireFamily(data.slug);
    if (!family) return { ok: false as const };
    const { provisionFromSession } = await import("./billing.server");
    const result = await provisionFromSession(data.sessionId, data.environment);
    return { ok: result.status === "ready" };
  });
