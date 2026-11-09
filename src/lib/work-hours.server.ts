import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import type { WorkingDay } from "./agreement.model";
import { normalizeAgreement } from "./agreement.model";
import { agreementMode } from "./agreement-mode.server";
import { requireFamily, requireSharedFamily } from "./family.server";
import { listNannyRows } from "./wallet.server";
import { cleanWorkingDays, effectiveWorkingDays, hasHours } from "./work-hours";

export type NannyHours = {
  nannyId: string;
  nannyName: string;
  days: WorkingDay[];
  /** Where the hours on show come from. Only "manual" hours can be edited here. */
  source: "agreement" | "manual";
};

export async function loadWorkHours(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const [rows, mode, { data: agreements }, { data: manual }] = await Promise.all([
    listNannyRows(family.id),
    agreementMode(family.id),
    supabaseAdmin.from("nanny_agreements").select("nanny_id, agreement_data").eq("family_id", family.id),
    supabaseAdmin.from("nanny_work_hours").select("nanny_id, working_days").eq("family_id", family.id),
  ]);
  const nannies: NannyHours[] = rows.map((row) => {
    const agreement = (agreements ?? []).find((a) => a.nanny_id === row.id);
    const agreementDays = agreement ? normalizeAgreement(agreement.agreement_data).workingDays : [];
    const manualDays = (manual ?? []).find((m) => m.nanny_id === row.id)?.working_days;
    const manualClean = manualDays ? cleanWorkingDays(manualDays) : null;
    const shown = effectiveWorkingDays(mode.enabled, agreementDays, manualClean);
    return {
      nannyId: row.id,
      nannyName: row.name,
      days: shown.length ? shown : cleanWorkingDays([]),
      source: mode.enabled && hasHours(agreementDays) ? "agreement" : "manual",
    };
  });
  return { access: family.access, agreementsOn: mode.enabled, nannies };
}

export async function saveWorkHours(slug: string, nannyId: string, days: unknown) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change working hours.");
  const clean = cleanWorkingDays(days);
  const nannies = await listNannyRows(family.id);
  if (!nannies.some((n) => n.id === nannyId)) throw new Error("That person isn't in this household.");
  const { error } = await supabaseAdmin
    .from("nanny_work_hours")
    .upsert(
      { family_id: family.id, nanny_id: nannyId, working_days: clean as unknown as Json, updated_at: new Date().toISOString() },
      { onConflict: "nanny_id" },
    );
  if (error) throw new Error("Couldn't save those hours.");
  await (await import("./notifications.server")).notifyOther({ id: family.id, access: "family" }, "planner", "Working hours were updated");
}

export async function setUseAgreement(slug: string, use: boolean) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change this.");
  const { lockedByAgency } = await agreementMode(family.id);
  if (lockedByAgency) throw new Error("Your agency has set this for your household, so it can't be changed here.");
  const { error } = await supabaseAdmin.from("families").update({ use_agreement: use }).eq("id", family.id);
  if (error) throw new Error("Couldn't save that choice.");
}
