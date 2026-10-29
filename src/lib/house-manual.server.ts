import { setResponseHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { canManageManual, manualEntrySchema, manualSummary, type ManualData, type ManualInput } from "./house-manual.types";

async function manualFamily(slug: string, write = false) {
  setResponseHeader("Cache-Control", "no-store");
  const family = await requireSharedFamily(slug);
  if (write && !canManageManual(family?.access ?? null)) throw new Error("Only parents or guardians can change the house manual.");
  return family;
}

export async function loadHouseManual(slug: string): Promise<ManualData | null> {
  const family = await manualFamily(slug);
  if (!family) return null;
  const { data, error } = await supabaseAdmin.from("house_manual_entries")
    .select("id, category, title, notes, has_secret, updated_at").eq("family_id", family.id).order("title");
  if (error) throw new Error("Couldn't load the house manual.");
  return { access: family.access, entries: (data ?? []).map(manualSummary) };
}

export async function saveHouseManual(slug: string, input: ManualInput) {
  const family = await manualFamily(slug, true);
  if (!family) throw new Error("Please unlock your wallet.");
  const entry = manualEntrySchema.parse(input);
  const values = { category: entry.category, title: entry.title, notes: entry.notes, updated_at: new Date().toISOString(),
    ...(entry.secretValue !== undefined ? { secret_value: entry.secretValue || null } : {}) };
  const result = entry.id
    ? await supabaseAdmin.from("house_manual_entries").update(values).eq("id", entry.id).eq("family_id", family.id).select("id").maybeSingle()
    : await supabaseAdmin.from("house_manual_entries").insert({ ...values, family_id: family.id }).select("id").single();
  if (result.error || !result.data) throw new Error("Couldn't save that household detail.");
  return { ok: true as const };
}

export async function revealHouseManual(slug: string, id: string) {
  const family = await manualFamily(slug);
  if (!family) throw new Error("Please unlock your wallet.");
  const { data, error } = await supabaseAdmin.from("house_manual_entries").select("secret_value")
    .eq("id", id).eq("family_id", family.id).maybeSingle();
  if (error || !data) throw new Error("Household detail not found.");
  return { value: data.secret_value ?? "" };
}

export async function deleteHouseManual(slug: string, id: string) {
  const family = await manualFamily(slug, true);
  if (!family) throw new Error("Please unlock your wallet.");
  const { error } = await supabaseAdmin.from("house_manual_entries").delete().eq("id", id).eq("family_id", family.id);
  if (error) throw new Error("Couldn't remove that household detail.");
  return { ok: true as const };
}