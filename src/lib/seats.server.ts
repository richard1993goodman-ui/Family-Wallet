import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AGENCY_PLANS, isAgencyPlan } from "./agency-plans";

/** One seat is one active family wallet. Cancelling a family frees its seat. */
export async function seatsFor(agencyId: string) {
  const [{ data: agency }, { count }] = await Promise.all([
    supabaseAdmin.from("partner_agencies").select("plan, household_allowance").eq("id", agencyId).maybeSingle(),
    supabaseAdmin
      .from("families")
      .select("id", { count: "exact", head: true })
      .eq("partner_agency_id", agencyId)
      .eq("status", "active"),
  ]);
  const plan = isAgencyPlan(agency?.plan) ? agency.plan : "partner";
  const seats = agency?.household_allowance ?? AGENCY_PLANS[plan].allowance;
  return { seats, used: count ?? 0 };
}

/** Throws when a partner agency has no free seat. `null` seats means no fixed limit. */
export async function assertSeatAvailable(agencyId: string) {
  const { seats, used } = await seatsFor(agencyId);
  if (seats !== null && used >= seats) {
    throw new Error(
      `All ${seats} of your seats are in use. Cancel a family to free a seat, or ask us to add more.`,
    );
  }
}
