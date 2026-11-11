import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireFamily } from "./family.server";
import { isStaffRole, staffLimitFor, type StaffLimit } from "./staff-roles";
import { ensureNannyInvite, listNannyRows } from "./wallet.server";
import { buildNannyInviteEmail } from "./nanny-invite-email";
import { isValidEmail, normaliseEmail } from "./seat-invites";

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
  const plan = data?.plan === "family" ? "family" : null;
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
        // Every staff member has a sign-in from the moment they are added: the family copies or emails it.
        code: row.nanny_code ?? (await ensureNannyInvite(slug, row.id))?.code ?? null,
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
      `Up to ${staffLimit.limit} staff per household`,
    );
  }

  const { data, error } = await supabaseAdmin
    .from("family_nannies")
    .insert({ ...row, family_id: family.id, sort_order: existing.length })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  // Their sign-in code is made straight away, so the family can send it without an extra step.
  await ensureNannyInvite(slug, data.id).catch(() => null);
  return { id: data.id };
}

const EMAILS_PER_HOUR = 10;

/** Emails a staff member their own wallet link and access code. The family never has to create anything first. */
export async function emailStaffLogin(slug: string, nannyId: string, rawEmail: string) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can send a login.");
  const to = normaliseEmail(rawEmail);
  if (!isValidEmail(to)) throw new Error("Enter a valid email address.");

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const key = `staff-login|${slug}`;
  const { count } = await supabaseAdmin
    .from("wallet_access_attempts")
    .select("id", { count: "exact", head: true })
    .eq("client_key", key)
    .gte("attempted_at", since);
  if ((count ?? 0) >= EMAILS_PER_HOUR) throw new Error("That's a lot of emails. Please try again in an hour.");

  const invite = await ensureNannyInvite(slug, nannyId);
  if (!invite) throw new Error("That person isn't in your household.");
  const { emailConfigured, sendEmail } = await import("./email.server");
  if (!emailConfigured()) throw new Error("Email isn't set up yet. Copy the link and code instead.");
  const { siteUrl, CONTACT_EMAIL } = await import("./site");
  const message = buildNannyInviteEmail({
    nannyName: invite.nannyName,
    familyName: family.family_name,
    url: siteUrl(`/nanny/${slug}`),
    code: invite.code,
    supportEmail: process.env["EMAIL_REPLY_TO"] || CONTACT_EMAIL,
  });
  if (!(await sendEmail({ to, ...message }))) throw new Error("The email couldn't be sent. Check the address and try again.");
  await supabaseAdmin.from("wallet_access_attempts").insert({ slug: "staff-login", client_key: key, succeeded: true });
  return { ok: true as const };
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
