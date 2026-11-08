import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireFamily } from "./family.server";
import { isStaffRole, staffLimitFor, type StaffLimit } from "./staff-roles";
import { listNannyRows } from "./wallet.server";

function clean(value: string | undefined | null, max = 1000) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export type { NannyInput } from "./nannies.types";
import type { NannyInput } from "./nannies.types";
export type NannySummary = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  photoUrl: string | null;
  emergencyName: string | null;
  emergencyRelationship: string | null;
  emergencyPhone: string | null;
  code: string | null;
  invitedAt: string | null;
  agreementStatus: "none" | "draft" | "issued";
  agreementSigned: boolean;
};

/** Households that bought a plan themselves are capped by it; agency households are not. */
async function staffLimitForFamily(familyId: string): Promise<StaffLimit> {
  const { data } = await supabaseAdmin
    .from("family_subscriptions")
    .select("plan, status")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = data?.plan === "family" || data?.plan === "household" ? data.plan : null;
  return staffLimitFor(plan);
}

/** Everyone the family employs through us, with where their agreement has got to. */
export async function loadNannies(slug: string) {
  const family = await requireFamily(slug);
  if (!family) return null;

  const rows = await listNannyRows(family.id);
  const [{ data: agreements }, { data: sigs }] = await Promise.all([
    supabaseAdmin
      .from("nanny_agreements")
      .select("nanny_id, status, version")
      .eq("family_id", family.id),
    supabaseAdmin
      .from("document_signatures")
      .select("nanny_id, signer_role, doc_version")
      .eq("family_id", family.id)
      .eq("doc_kind", "agreement"),
  ]);

  const nannies: NannySummary[] = await Promise.all(
    rows.map(async (row) => {
      let photoUrl: string | null = null;
      if (row.photo_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("family-docs")
          .createSignedUrl(row.photo_path, 300);
        photoUrl = signed?.signedUrl ?? null;
      }
      const agreement = (agreements ?? []).find((a) => a.nanny_id === row.id) ?? null;
      const mine = (sigs ?? []).filter(
        (s) => s.nanny_id === row.id && s.doc_version === String(agreement?.version ?? 1),
      );
      return {
        id: row.id,
        name: row.name,
        role: row.role,
        bio: row.bio,
        photoUrl,
        emergencyName: row.emergency_name,
        emergencyRelationship: row.emergency_relationship,
        emergencyPhone: row.emergency_phone,
        code: row.nanny_code,
        invitedAt: row.invited_at,
        agreementStatus: (agreement?.status as "draft" | "issued") ?? "none",
        agreementSigned:
          agreement?.status === "issued" &&
          mine.some((s) => s.signer_role === "parent") &&
          mine.some((s) => s.signer_role === "nanny"),
      };
    }),
  );

  const staffLimit = await staffLimitForFamily(family.id);
  return {
    familyName: family.family_name,
    nannies,
    staffLimit: { ...staffLimit, used: nannies.length, canAdd: nannies.length < staffLimit.limit },
  };
}

export async function saveNanny(slug: string, input: NannyInput) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change their nannies");
  const name = clean(input.name, 120);
  if (!name) throw new Error("Please add a name");

  const role = input.role ?? "nanny";
  if (!isStaffRole(role)) throw new Error("Please choose a role");

  const row = {
    name,
    role,
    bio: clean(input.bio, 2000),
    emergency_name: clean(input.emergencyName, 80),
    emergency_relationship: clean(input.emergencyRelationship, 80),
    emergency_phone: clean(input.emergencyPhone, 60),
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabaseAdmin
      .from("family_nannies")
      .update(row)
      .eq("id", input.id)
      .eq("family_id", family.id);
    if (error) throw new Error(error.message);
    return { id: input.id };
  }

  const existing = await listNannyRows(family.id);
  const staffLimit = await staffLimitForFamily(family.id);
  if (existing.length >= staffLimit.limit) {
    throw new Error(
      staffLimit.upgradeable
        ? `Your ${staffLimit.planName} plan includes ${staffLimit.limit} staff member. Upgrade to Household to add up to 6.`
        : `Up to ${staffLimit.limit} staff per household`,
    );
  }

  const { data, error } = await supabaseAdmin
    .from("family_nannies")
    .insert({ ...row, family_id: family.id, sort_order: existing.length })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

/** Archived rather than deleted so signed agreements are never lost. */
export async function archiveNanny(slug: string, id: string) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change their nannies");
  const { error } = await supabaseAdmin
    .from("family_nannies")
    .update({ status: "archived", nanny_code: null, nanny_code_hash: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

export async function uploadNannyPhoto(
  slug: string,
  nannyId: string,
  fileName: string,
  contentType: string,
  base64: string,
) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change their nannies");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > 8 * 1024 * 1024) throw new Error("Photo must be under 8MB");
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${family.id}/nanny-${nannyId}-${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("family-docs")
    .upload(path, bytes, { contentType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await supabaseAdmin
    .from("family_nannies")
    .update({ photo_path: path, updated_at: new Date().toISOString() })
    .eq("id", nannyId)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}
