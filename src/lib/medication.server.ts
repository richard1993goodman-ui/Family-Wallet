import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import type { DoseInput } from "./medication.types";

function clean(value: string | undefined | null, max = 300) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function loadMedication(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;

  const [{ data: doses }, { data: children }] = await Promise.all([
    supabaseAdmin
      .from("medication_doses")
      .select(
        "id, child_name, medicine, dose, given_at, given_by, given_by_name, next_dose_from, reason, notes",
      )
      .eq("family_id", family.id)
      .order("given_at", { ascending: false })
      .limit(60),
    supabaseAdmin
      .from("family_children")
      .select("name, allergies, medication")
      .eq("family_id", family.id)
      .order("sort_order"),
  ]);

  return {
    access: family.access,
    familyName: family.family_name,
    children: (children ?? []).map((c) => ({
      name: c.name,
      allergies: c.allergies,
      medication: c.medication,
    })),
    doses: (doses ?? []).map((d) => ({
      id: d.id,
      childName: d.child_name,
      medicine: d.medicine,
      dose: d.dose,
      givenAt: d.given_at,
      givenBy: d.given_by,
      givenByName: d.given_by_name,
      nextDoseFrom: d.next_dose_from,
      reason: d.reason,
      notes: d.notes,
    })),
  };
}

export async function recordDose(slug: string, input: DoseInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  if (!input.childName?.trim()) throw new Error("Please choose who the dose was for.");
  if (!input.medicine?.trim()) throw new Error("Please say which medicine was given.");

  const givenAt = input.givenAt ? new Date(input.givenAt) : new Date();
  if (Number.isNaN(givenAt.getTime())) throw new Error("Please check the time given.");

  const { error } = await supabaseAdmin.from("medication_doses").insert({
    family_id: family.id,
    child_name: clean(input.childName, 120)!,
    medicine: clean(input.medicine, 120)!,
    dose: clean(input.dose, 120),
    given_at: givenAt.toISOString(),
    given_by: family.access,
    given_by_name: family.access === "nanny" ? family.nanny_name : family.family_name,
    next_dose_from: input.nextDoseFrom ? new Date(input.nextDoseFrom).toISOString() : null,
    reason: clean(input.reason, 200),
    notes: clean(input.notes, 600),
  });
  if (error) throw new Error(error.message);
  await (await import("./notifications.server")).notifyOther(family, "medication", "A medicine dose was logged");
  return { ok: true as const };
}

export async function deleteDose(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const { error } = await supabaseAdmin
    .from("medication_doses")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}
