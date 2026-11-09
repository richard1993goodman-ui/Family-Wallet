import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import {
  PERMISSION_ANSWERS,
  PERMISSION_CATEGORIES,
  PRESET_KEYS,
  type PermissionInput,
} from "./permissions.types";

function clean(value: string | undefined | null, max: number) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : "";
}

export async function loadPermissions(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;

  const { data } = await supabaseAdmin
    .from("household_permissions")
    .select("permission_key, label, category, answer, note, is_custom, updated_by_name, updated_at")
    .eq("family_id", family.id)
    .order("updated_at", { ascending: true });

  return {
    access: family.access,
    familyName: family.family_name,
    nannyName: family.nanny_name,
    permissions: (data ?? []).map((p) => ({
      key: p.permission_key,
      label: p.label,
      category: p.category,
      answer: p.answer,
      note: p.note,
      isCustom: p.is_custom,
      updatedByName: p.updated_by_name,
      updatedAt: p.updated_at,
    })),
  };
}

export async function setPermission(slug: string, input: PermissionInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  if (family.access !== "family") throw new Error("Only a parent can change permissions.");

  const key = clean(input.key, 80);
  const label = clean(input.label, 120);
  if (!key || !label) throw new Error("Please add a name for this permission.");
  if (!PERMISSION_ANSWERS.some((a) => a.value === input.answer)) {
    throw new Error("Please choose an answer.");
  }
  if (!PERMISSION_CATEGORIES.some((c) => c.value === input.category)) {
    throw new Error("Please choose a category.");
  }
  // Presets can only be answered; the question wording is ours. Anything else must be marked custom.
  const isPreset = PRESET_KEYS.includes(key);
  if (!isPreset && !input.isCustom) throw new Error("Unknown permission.");

  const { error } = await supabaseAdmin.from("household_permissions").upsert(
    {
      family_id: family.id,
      permission_key: key,
      label,
      category: input.category,
      answer: input.answer,
      note: clean(input.note, 1000),
      is_custom: !isPreset,
      updated_by_name: family.family_name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "family_id,permission_key" },
  );
  if (error) throw new Error(error.message);
  await (await import("./notifications.server")).notifyOther(family, "permissions", "Permissions were updated");
}

export async function removePermission(slug: string, key: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  if (family.access !== "family") throw new Error("Only a parent can change permissions.");
  const { error } = await supabaseAdmin
    .from("household_permissions")
    .delete()
    .eq("family_id", family.id)
    .eq("permission_key", key);
  if (error) throw new Error(error.message);
}
