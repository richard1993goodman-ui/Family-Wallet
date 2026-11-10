import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { planIncludes, type GatedFeature } from "./plan-access";

const LIVE_STATUSES = ["active", "trialing", "past_due"];

/** The family's current self-serve plan, or null when it has none (agency or demo wallet). */
export async function currentPlan(familyId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("family_subscriptions")
    .select("plan, status")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || !LIVE_STATUSES.includes(data.status)) return null;
  return data.plan;
}

export async function familyHasFeature(familyId: string, feature: GatedFeature) {
  return planIncludes(await currentPlan(familyId), feature);
}
