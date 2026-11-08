import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isInterval, isPlan } from "./billing.config";
import { sendEmail } from "./email.server";
import { stripe } from "./stripe.server";
import { siteUrl } from "./site";
import { buildWalletEmail } from "./wallet-email";
import { generateAccessCode, hashCode } from "./wallet.server";

type StripeSubscription = {
  id: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  items?: { data?: { current_period_end?: number }[] };
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

async function existingWallet(sessionId: string) {
  const { data: row } = await supabaseAdmin
    .from("family_subscriptions")
    .select("family_id, plan")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (!row?.family_id) return null;
  const { data: family } = await supabaseAdmin
    .from("families")
    .select("slug, access_code, family_name")
    .eq("id", row.family_id)
    .maybeSingle();
  return family ? { slug: family.slug, code: family.access_code, familyName: family.family_name, plan: row.plan } : null;
}

/**
 * Turns a paid Checkout Session into a wallet. Safe to call more than once for the same session:
 * the success page and the webhook both call it, and the second call just returns the first result.
 */
export async function provisionFromSession(sessionId: string) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new Error("That payment link is not valid.");

  const already = await existingWallet(sessionId);
  if (already) return { status: "ready" as const, ...already };

  const session = await stripe<CheckoutSession>(
    `/checkout/sessions/${sessionId}`,
    { expand: ["subscription"] },
    "GET",
  );
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
  const familyName =
    session.customer_details?.name?.trim() || email?.split("@")[0] || "Your household";

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
      notes: `Self-serve ${plan} plan, billed per ${interval}. Stripe customer ${session.customer}.`,
      access_code: code,
      access_code_hash: hashCode(slug, code),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: subError } = await supabaseAdmin.from("family_subscriptions").insert({
    family_id: family.id,
    stripe_customer_id: session.customer,
    stripe_subscription_id: sub?.id ?? null,
    stripe_checkout_session_id: session.id,
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
      const winner = await existingWallet(sessionId);
      if (winner) return { status: "ready" as const, ...winner };
    }
    throw new Error(subError.message);
  }

  // Only the call that actually created the wallet gets here, so the email goes out once.
  if (email) {
    const message = buildWalletEmail("welcome", [{ familyName, url: siteUrl(`/w/${slug}`), code }]);
    await sendEmail({ to: email, ...message });
  }

  return { status: "ready" as const, slug, code, familyName, plan };
}

/** Keeps the subscription row, and the household's access, in step with Stripe. */
export async function applySubscription(sub: StripeSubscription) {
  const { data: row } = await supabaseAdmin
    .from("family_subscriptions")
    .update({
      status: sub.status,
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

export async function portalUrlFor(familyId: string, returnUrl: string) {
  const { data: row } = await supabaseAdmin
    .from("family_subscriptions")
    .select("stripe_customer_id")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return null;
  const session = await stripe<{ url: string }>("/billing_portal/sessions", {
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
