import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import type { WorkingDay } from "./agreement.model";
import { normalizeAgreement } from "./agreement.model";
import { agreementMode } from "./agreement-mode.server";
import { requireFamily, requireSharedFamily } from "./family.server";
import { listNannyRows } from "./wallet.server";
import { cleanSchedule, cleanWorkingDays, effectiveWorkingDays, hasHours, type WorkSchedule } from "./work-hours";

export type NannyHours = {
  nannyId: string;
  nannyName: string;
  days: WorkingDay[];
  schedule: WorkSchedule;
  /** Where the hours on show come from. Only "manual" hours can be edited here. */
  source: "agreement" | "manual";
  /** The agreement has hours the parent could switch back to. */
  agreementHasHours: boolean;
};

export async function loadWorkHours(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const [rows, mode, { data: agreements }, { data: manual }] = await Promise.all([
    listNannyRows(family.id),
    agreementMode(family.id),
    supabaseAdmin.from("nanny_agreements").select("nanny_id, agreement_data").eq("family_id", family.id),
    supabaseAdmin.from("nanny_work_hours").select("nanny_id, working_days, schedule").eq("family_id", family.id),
  ]);
  const nannies: NannyHours[] = rows.map((row) => {
    const agreement = (agreements ?? []).find((a) => a.nanny_id === row.id);
    const agreementDays = agreement ? normalizeAgreement(agreement.agreement_data).workingDays : [];
    const manualRow = (manual ?? []).find((m) => m.nanny_id === row.id);
    const manualDays = manualRow?.working_days;
    const manualClean = manualDays ? cleanWorkingDays(manualDays) : null;
    const schedule = cleanSchedule(manualRow?.schedule);
    const shown = effectiveWorkingDays(mode.enabled, agreementDays, manualClean, schedule);
    const usingAgreement = mode.enabled && hasHours(agreementDays) && !(schedule.hoursSource === "manual" && manualClean && hasHours(manualClean));
    return {
      nannyId: row.id,
      nannyName: row.name,
      days: shown.length ? shown : cleanWorkingDays([]),
      schedule,
      source: usingAgreement ? "agreement" : "manual",
      agreementHasHours: mode.enabled && hasHours(agreementDays),
    };
  });
  // Where the household is decides which public holidays are offered. Older databases without the columns default to the UK.
  const { data: place } = await supabaseAdmin.from("families").select("country, region").eq("id", family.id).maybeSingle();
  return { access: family.access, agreementsOn: mode.enabled, nannies, country: place?.country ?? "GB", region: place?.region ?? null };
}

export async function saveWorkHours(slug: string, nannyId: string, days: unknown, schedule: unknown) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change working hours.");
  const clean = cleanWorkingDays(days);
  const cleanPlan = cleanSchedule(schedule);
  const nannies = await listNannyRows(family.id);
  if (!nannies.some((n) => n.id === nannyId)) throw new Error("That person isn't in this household.");
  const { error } = await supabaseAdmin
    .from("nanny_work_hours")
    .upsert(
      { family_id: family.id, nanny_id: nannyId, working_days: clean as unknown as Json, schedule: cleanPlan as unknown as Json, updated_at: new Date().toISOString() },
      { onConflict: "nanny_id" },
    );
  if (error) throw new Error("Couldn't save those hours.");
  await (await import("./notifications.server")).notifyOther({ id: family.id, access: "family" }, "planner", "Working hours were updated");
}

export type AgreementChoice = "template" | "self_employed" | "none";
export const isAgreementChoice = (v: unknown): v is AgreementChoice => v === "template" || v === "self_employed" || v === "none";

/** The parent's first-sign-in choice. "none" turns the agreement off; the other two turn it on. */
export async function setAgreementChoice(slug: string, choice: unknown) {
  if (!isAgreementChoice(choice)) throw new Error("Choose one of the three options.");
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change this.");
  const { lockedByAgency } = await agreementMode(family.id);
  if (lockedByAgency) throw new Error("This has been set for your household, so it can't be changed here.");
  const { error } = await supabaseAdmin
    .from("families")
    .update({ agreement_choice: choice, use_agreement: choice !== "none" })
    .eq("id", family.id);
  if (error) throw new Error("Couldn't save that choice.");
}

export async function setUseAgreement(slug: string, use: boolean) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change this.");
  const { lockedByAgency } = await agreementMode(family.id);
  if (lockedByAgency) throw new Error("Your agency has set this for your household, so it can't be changed here.");
  const { error } = await supabaseAdmin
    .from("families")
    .update({ use_agreement: use, ...(use ? {} : { agreement_choice: "none" }) })
    .eq("id", family.id);
  if (error) throw new Error("Couldn't save that choice.");
  // Turning the agreement back on from "none" means the formal template, unless they pick another style later.
  if (use) await supabaseAdmin.from("families").update({ agreement_choice: "template" }).eq("id", family.id).eq("agreement_choice", "none");
}
