import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AGENCY_PLANS, isAgencyPlan, nextAgencyPlan, type AgencyPlanId } from "./agency-plans";

/**
 * The owner's whole view of a partner agency: its name, tier and how many seats it uses. No contacts,
 * staff, families or invitations are read or returned.
 */
export async function getTierBoard() {
  const [{ data: agencies }, { data: invites }] = await Promise.all([
    supabaseAdmin.from("partner_agencies").select("id, name, brand_name, plan, household_allowance").eq("status", "active").order("name"),
    supabaseAdmin.from("agency_invites").select("agency_id, status").in("status", ["pending", "accepted"]),
  ]);
  return (agencies ?? []).map((a) => {
    const plan: AgencyPlanId = isAgencyPlan(a.plan) ? a.plan : "partner";
    const mine = (invites ?? []).filter((i) => i.agency_id === a.id);
    const occupied = mine.filter((i) => i.status === "accepted").length;
    const invited = mine.length - occupied;
    const allowance = a.household_allowance ?? AGENCY_PLANS[plan].allowance;
    const next = nextAgencyPlan(plan);
    return {
      id: a.id,
      name: a.brand_name || a.name,
      plan,
      tier: AGENCY_PLANS[plan].name,
      pence: AGENCY_PLANS[plan].pence,
      allowance,
      occupied,
      invited,
      remaining: allowance === null ? null : Math.max(0, allowance - occupied - invited),
      next: next ? { plan: next, name: AGENCY_PLANS[next].name, pence: AGENCY_PLANS[next].pence, allowance: AGENCY_PLANS[next].allowance } : null,
    };
  });
}

/**
 * Moves an agency up one tier. `fromPlan` is what the owner saw on screen, so a double click or a stale
 * page can never skip a tier. Stripe is changed first (pro-rated); the agency's own record follows.
 */
export async function upgradeTier(agencyId: string, fromPlan: string) {
  const { data: agency } = await supabaseAdmin.from("partner_agencies").select("id, plan, status").eq("id", agencyId).maybeSingle();
  if (!agency || agency.status !== "active") throw new Error("Agency not found.");
  const current: AgencyPlanId = isAgencyPlan(agency.plan) ? agency.plan : "partner";
  if (current !== fromPlan) throw new Error("This agency's tier has changed. Refresh and try again.");
  const next = nextAgencyPlan(current);
  if (!next) throw new Error("There is no higher tier. Enterprise is priced by agreement.");

  const { data: sub } = await supabaseAdmin
    .from("family_subscriptions")
    .select("id, stripe_subscription_id, environment")
    .eq("agency_id", agencyId)
    .not("stripe_subscription_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let billing: "stripe" | "manual" = "manual";
  if (sub?.stripe_subscription_id) {
    const { createStripeClient } = await import("./stripe.server");
    const stripe = createStripeClient(sub.environment === "live" ? "live" : "sandbox");
    const prices = await stripe.prices.list({ lookup_keys: [`fw_agency_${next}_month`], active: true });
    const price = prices.data[0];
    if (!price) throw new Error("The next plan's price isn't set up in Stripe yet.");
    const live = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const item = live.items.data[0];
    if (!item) throw new Error("Couldn't read this agency's subscription.");
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: item.id, price: price.id }],
      proration_behavior: "create_prorations",
    });
    await supabaseAdmin.from("family_subscriptions").update({ plan: `agency_${next}` }).eq("id", sub.id);
    billing = "stripe";
  }

  // household_allowance is cleared so the new tier's own seat count applies.
  await supabaseAdmin.from("partner_agencies").update({ plan: next, household_allowance: null }).eq("id", agencyId).eq("plan", current);
  return { plan: next, billing };
}
