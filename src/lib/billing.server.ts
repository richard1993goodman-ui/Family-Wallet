import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  isAgencyPlan,
  isInterval,
  isPlan,
  planFromLookupKey,
  PLANS,
  type AgencyPlanId,
  type PlanId,
} from "./billing.config";
import { sendEmail } from "./email.server";
import { buildAgencyOwnerEmail, buildAgencyWelcomeEmail } from "./agency-email";
import { CONTACT_EMAIL, siteUrl } from "./site";
import type { StripeEnv } from "./stripe.server";
import { buildWalletEmail } from "./wallet-email";
import { generateAccessCode, hashCode } from "./wallet.server";

type StripeSubscription = {
  id: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  items?: { data?: { current_period_end?: number; price?: { lookup_key?: string | null } }[] };
};

type CheckoutSession = {
  id: string;
  mode: string;
  payment_status: string;
  customer: string | null;
  customer_email: string | null;
  customer_details?: { name?: string | null; email?: string | null } | null;
  metadata?: Record<string, string> | null;
  subscription: StripeSubscription | string | null;
};

/** What a paid session turns into: a family's own wallet, or an agency account. */
export type Provisioned =
  | {
      status: "ready";
      kind: "family";
      slug: string;
      code: string;
      familyName: string;
      plan: PlanId;
    }
  | {
      status: "ready";
      kind: "agency";
      agencyName: string;
      allowance: number;
      plan: PlanId;
    }
  | { status: "pending" };

// Statuses where the household should no longer have access. past_due keeps access while Stripe retries.
const ENDED = new Set(["canceled", "unpaid", "incomplete_expired"]);
const LIVE = new Set(["active", "trialing", "past_due"]);

function periodEnd(sub: StripeSubscription) {
  // Newer Stripe API versions move the period onto the subscription item.
  const seconds = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function slugFor(name: string) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "family";
  return `${base}-${generateAccessCode().slice(0, 4).toLowerCase()}`;
}

/** The subscription row for a session, if one was already written by the other caller. */
async function existingRow(sessionId: string) {
  const { data: row } = await supabaseAdmin
    .from("family_subscriptions")
    .select("family_id, plan, agency_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (!row || !isPlan(row.plan)) return null;
  return { ...row, plan: row.plan as PlanId };
}

async function familyWallet(familyId: string, plan: PlanId): Promise<Provisioned> {
  const { data: family } = await supabaseAdmin
    .from("families")
    .select("slug, access_code, family_name")
    .eq("id", familyId)
    .maybeSingle();
  if (!family) throw new Error("We could not find the wallet for that payment.");
  return {
    status: "ready",
    kind: "family",
    slug: family.slug,
    code: family.access_code,
    familyName: family.family_name,
    plan,
  };
}

async function agencyAccount(agencyId: string, plan: PlanId): Promise<Provisioned> {
  const { data: agency } = await supabaseAdmin
    .from("partner_agencies")
    .select("name, household_allowance")
    .eq("id", agencyId)
    .maybeSingle();
  if (!agency) throw new Error("We could not find the agency account for that payment.");
  return {
    status: "ready",
    kind: "agency",
    agencyName: agency.name,
    allowance: agency.household_allowance ?? PLANS[plan].allowance ?? 0,
    plan,
  };
}

/**
 * Turns a paid Checkout Session into a wallet or an agency account. Safe to call more than
 * once for the same session: the success page and the webhook both call it, and the second
 * call just returns the first result.
 */
export async function provisionFromSession(
  sessionId: string,
  environment: StripeEnv,
): Promise<Provisioned> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new Error("That payment link is not valid.");

  const already = await existingRow(sessionId);
  if (already?.family_id) return familyWallet(already.family_id, already.plan);
  if (already?.agency_id) return agencyAccount(already.agency_id, already.plan);

  const { createStripeClient } = await import("./stripe.server");
  const stripe = createStripeClient(environment);
  const session = (await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  })) as unknown as CheckoutSession;
  if (session.metadata?.["app"] !== "family_wallet" || session.mode !== "subscription") {
    throw new Error("That payment was not for a Family Wallet plan.");
  }
  if (session.payment_status !== "paid") return { status: "pending" as const };

  const plan = session.metadata["plan"];
  const interval = session.metadata["interval"];
  if (!isPlan(plan) || !isInterval(interval) || !session.customer) {
    throw new Error("We could not read the plan on that payment.");
  }
  const sub = typeof session.subscription === "object" ? session.subscription : null;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const named = session.customer_details?.name?.trim() || email?.split("@")[0] || "Your household";

  return isAgencyPlan(plan)
    ? provisionAgency({ sessionId, plan, sub, email, customerId: session.customer, agencyName: named })
    : provisionFamily({
        sessionId,
        plan,
        interval,
        sub,
        email,
        customerId: session.customer,
        familyName: named,
      });
}

/** A family that bought a plan for their own household. */
async function provisionFamily({
  sessionId,
  plan,
  interval,
  sub,
  email,
  customerId,
  familyName,
}: {
  sessionId: string;
  plan: PlanId;
  interval: string;
  sub: StripeSubscription | null;
  email: string | null;
  customerId: string;
  familyName: string;
}): Promise<Provisioned> {
  const slug = slugFor(familyName);
  const code = generateAccessCode();
  const { data: family, error } = await supabaseAdmin
    .from("families")
    .insert({
      slug,
      family_name: familyName,
      contact_email: email,
      tier_band: "3",
      status: "active",
      notes: `Self-serve ${plan} plan, billed per ${interval}. Stripe customer ${customerId}.`,
      access_code: code,
      access_code_hash: hashCode(slug, code),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: subError } = await supabaseAdmin.from("family_subscriptions").insert({
    family_id: family.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub?.id ?? null,
    stripe_checkout_session_id: sessionId,
    plan,
    billing_interval: interval,
    status: sub?.status ?? "active",
    current_period_end: sub ? periodEnd(sub) : null,
    cancel_at_period_end: sub?.cancel_at_period_end ?? false,
    customer_email: email,
  });
  if (subError) {
    // 23505: the other caller (webhook or success page) got there first. Drop our copy and use theirs.
    await supabaseAdmin.from("families").delete().eq("id", family.id);
    if (subError.code === "23505") {
      const winner = await existingRow(sessionId);
      const won = winner?.family_id ? await familyWallet(winner.family_id, winner.plan) : null;
      if (won) return won;
    }
    throw new Error(subError.message);
  }

  // Only the call that actually created the wallet gets here, so the email goes out once.
  if (email) {
    const message = buildWalletEmail("welcome", [{ familyName, url: siteUrl(`/w/${slug}`), code }], {
      supportEmail: process.env["EMAIL_REPLY_TO"] || CONTACT_EMAIL,
    });
    await sendEmail({ to: email, ...message });
  }

  return { status: "ready", kind: "family", slug, code, familyName, plan };
}

/** An agency that bought a plan for the families it places with. */
async function provisionAgency({
  sessionId,
  plan,
  sub,
  email,
  customerId,
  agencyName,
}: {
  sessionId: string;
  plan: AgencyPlanId;
  sub: StripeSubscription | null;
  email: string | null;
  customerId: string;
  agencyName: string;
}): Promise<Provisioned> {
  const allowance = PLANS[plan].allowance ?? 0;
  const { data: agency, error } = await supabaseAdmin
    .from("partner_agencies")
    .insert({
      name: agencyName,
      brand_name: agencyName,
      contact_email: email,
      plan: plan.replace("agency_", ""),
      household_allowance: allowance,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: subError } = await supabaseAdmin.from("family_subscriptions").insert({
    agency_id: agency.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub?.id ?? null,
    stripe_checkout_session_id: sessionId,
    plan,
    billing_interval: "month",
    status: sub?.status ?? "active",
    current_period_end: sub ? periodEnd(sub) : null,
    cancel_at_period_end: sub?.cancel_at_period_end ?? false,
    customer_email: email,
  });
  if (subError) {
    // The webhook got there first: keep its row and use the agency it already created.
    await supabaseAdmin.from("partner_agencies").delete().eq("id", agency.id);
    if (subError.code === "23505") {
      const winner = await existingRow(sessionId);
      const won = winner?.agency_id ? await agencyAccount(winner.agency_id, winner.plan) : null;
      if (won) return won;
    }
    throw new Error(subError.message);
  }

  const details = { agencyName, plan, allowance, contactEmail: email ?? CONTACT_EMAIL };
  if (email) {
    const message = buildAgencyWelcomeEmail(details);
    await sendEmail({ to: email, ...message });
  }
  // The owner has to create the agency's staff login, so they hear about it the same moment.
  const owner = buildAgencyOwnerEmail(details);
  await sendEmail({ to: CONTACT_EMAIL, ...owner });

  return { status: "ready", kind: "agency", agencyName, allowance, plan };
}

/** Keeps the subscription row, and the household's access, in step with Stripe. */
export async function applySubscription(sub: StripeSubscription) {
  const newPlan = planFromLookupKey(sub.items?.data?.[0]?.price?.lookup_key);
  const { data: row } = await supabaseAdmin
    .from("family_subscriptions")
    .update({
      status: sub.status,
      // An upgrade or downgrade in Stripe arrives here as a new price on the subscription.
      ...(newPlan ? { plan: newPlan } : {}),
      current_period_end: periodEnd(sub),
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id)
    .select("family_id")
    .maybeSingle();
  // No row yet means the checkout event has not been processed; it will carry the latest state.
  if (!row?.family_id) return;

  const next = ENDED.has(sub.status) ? "cancelled" : LIVE.has(sub.status) ? "active" : null;
  if (next) {
    await supabaseAdmin
      .from("families")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", row.family_id);
  }
}

/**
 * Stripe's billing portal for a household that paid here. The row says which payment
 * environment created it, so a test subscription is never opened against the live one.
 */
export async function portalUrlFor(familyId: string, returnUrl: string) {
  const { data: row } = await supabaseAdmin
    .from("family_subscriptions")
    .select("stripe_customer_id, environment")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return null;

  const environment: StripeEnv = row.environment === "live" ? "live" : "sandbox";
  const { createStripeClient } = await import("./stripe.server");
  const stripe = createStripeClient(environment);
  const session = await stripe.billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: returnUrl,
  });
  return session.url;
}

export async function hasSubscription(familyId: string) {
  const { count } = await supabaseAdmin
    .from("family_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId);
  return (count ?? 0) > 0;
}

const RECOVERY_LIMITS = { perClient: 5, perEmail: 3, windowMinutes: 60 };

/**
 * Emails the wallet link and access code to a household that paid on the pricing page.
 * Always looks the same to the caller, so it cannot be used to discover who has a wallet.
 */
export async function sendWalletDetails(rawEmail: string, clientKey: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return;

  // Throttle with the existing access-attempts table, so no one can use this to spam an inbox.
  const since = new Date(Date.now() - RECOVERY_LIMITS.windowMinutes * 60 * 1000).toISOString();
  const keys = [
    { key: `recover|${clientKey}`, limit: RECOVERY_LIMITS.perClient },
    { key: `recover-email|${email}`, limit: RECOVERY_LIMITS.perEmail },
  ];
  for (const { key, limit } of keys) {
    const { count } = await supabaseAdmin
      .from("wallet_access_attempts")
      .select("id", { count: "exact", head: true })
      .eq("client_key", key)
      .gte("attempted_at", since);
    if ((count ?? 0) >= limit) return;
  }
  await supabaseAdmin
    .from("wallet_access_attempts")
    .insert(keys.map(({ key }) => ({ slug: "recover", client_key: key, succeeded: false })));

  // Only households that bought a plan here. Agency households ask their agency instead.
  const like = email.replace(/[\\%_]/g, "\\$&");
  const { data: subs } = await supabaseAdmin
    .from("family_subscriptions")
    .select("family_id")
    .ilike("customer_email", like)
    .not("family_id", "is", null);
  const ids = (subs ?? []).map((s) => s.family_id).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return;

  const { data: families } = await supabaseAdmin
    .from("families")
    .select("slug, family_name, access_code")
    .in("id", ids)
    .eq("status", "active");
  if (!families?.length) return;

  const message = buildWalletEmail(
    "recover",
    families.map((f) => ({ familyName: f.family_name, url: siteUrl(`/w/${f.slug}`), code: f.access_code })),
  );
  await sendEmail({ to: email, ...message });
}

/**
 * The person who paid for an agency plan becomes its first staff login. Returns a one-time
 * link to set their password and authenticator app, or null once they have already joined
 * (so a leaked confirmation URL cannot be reused to take over the login).
 */
export async function agencyOwnerSetupLink(sessionId: string): Promise<string | null> {
  const { data: row } = await supabaseAdmin
    .from("family_subscriptions")
    .select("agency_id, customer_email")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  const email = row?.customer_email?.trim().toLowerCase();
  if (!row?.agency_id || !email) return null;

  const { data: staff } = await supabaseAdmin
    .from("partner_agency_staff")
    .select("agency_id, user_id")
    .eq("email", email)
    .maybeSingle();
  if (staff && staff.agency_id !== row.agency_id) return null; // email already belongs to another agency
  if (staff?.user_id) return null;
  if (!staff) {
    const { error } = await supabaseAdmin
      .from("partner_agency_staff")
      .insert({ agency_id: row.agency_id, email });
    if (error && error.code !== "23505") throw new Error(error.message);
  }

  const options = { redirectTo: siteUrl("/auth?setup=1") };
  let res = await supabaseAdmin.auth.admin.generateLink({ type: "invite", email, options });
  if (res.error) res = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email, options });
  const link = res.data?.properties?.action_link;
  if (res.error || !link) {
    console.error("agency setup link failed", res.error?.message);
    return null;
  }
  return link;
}
