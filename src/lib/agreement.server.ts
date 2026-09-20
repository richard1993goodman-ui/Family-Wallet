import { getRequest } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { isUnlocked, listNannyRows, sessionAccess } from "./wallet.server";
import { TERMS_VERSION } from "./tiers";
import {
  agreementHasContent,
  defaultAgreementData,
  normalizeAgreement,
  type AgreementData,
} from "./agreement.model";
import type { Signature } from "./agreement.types";

export type EmergencyContext = {
  homeAddress: string | null;
  gpDetails: string | null;
  medicalNotes: string | null;
  emergencyInstructions: string | null;
  children: { name: string; school: string | null; allergies: string | null; medication: string | null }[];
  contacts: { name: string; relationship: string | null; phone: string }[];
};

export type AgreementView = {
  familyName: string;
  status: "draft" | "issued";
  version: number;
  issuedAt: string | null;
  updatedAt: string | null;
  data: AgreementData;
  hasContent: boolean;
  signatures: Signature[];
  access: "family" | "nanny";
  emergency: EmergencyContext;
};

function clientKey() {
  try {
    const request = getRequest();
    const forwarded = request.headers.get("x-forwarded-for") ?? "";
    return (forwarded.split(",")[0] || request.headers.get("cf-connecting-ip") || "unknown").trim();
  } catch {
    return "unknown";
  }
}

function clean(value: string | undefined | null, max = 6000) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function mapSignatures(rows: Record<string, unknown>[] | null): Signature[] {
  return (rows ?? []).map((r) => ({
    docKind: r["doc_kind"] as Signature["docKind"],
    signerRole: r["signer_role"] as Signature["signerRole"],
    signerName: r["signer_name"] as string,
    docVersion: r["doc_version"] as string,
    signedAt: r["signed_at"] as string,
  }));
}

async function familyBySlug(slug: string) {
  const { data } = await supabaseAdmin
    .from("families")
    .select("id, family_name, nanny_name, start_date")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return data ?? null;
}

/** Legacy rows stored a spare "legacyNotes" string — fold it into the duties clause. */
function withLegacyNotes(raw: unknown): AgreementData {
  const data = normalizeAgreement(raw);
  const notes =
    raw && typeof raw === "object"
      ? ((raw as Record<string, unknown>)["legacyNotes"] as string | undefined)
      : undefined;
  if (notes && !data.otherDutiesClause.includes(notes)) {
    data.otherDutiesClause = [data.otherDutiesClause, notes].filter(Boolean).join("\n\n");
  }
  return data;
}

/* ---------------- Family-facing (wallet unlocked) ---------------- */

/** Everything the parent has put on the emergency card, reused elsewhere. */
export async function loadEmergencyContext(familyId: string): Promise<EmergencyContext> {
  const [{ data: profile }, { data: children }, { data: contacts }] = await Promise.all([
    supabaseAdmin
      .from("family_profile")
      .select("home_address, gp_details, medical_notes, emergency_instructions")
      .eq("family_id", familyId)
      .maybeSingle(),
    supabaseAdmin
      .from("family_children")
      .select("name, school, allergies, medication")
      .eq("family_id", familyId)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("family_contacts")
      .select("name, relationship, phone")
      .eq("family_id", familyId)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    homeAddress: profile?.home_address ?? null,
    gpDetails: profile?.gp_details ?? null,
    medicalNotes: profile?.medical_notes ?? null,
    emergencyInstructions: profile?.emergency_instructions ?? null,
    children: (children ?? []).map((c) => ({
      name: c.name,
      school: c.school,
      allergies: c.allergies,
      medication: c.medication,
    })),
    contacts: (contacts ?? []).map((c) => ({
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
    })),
  };
}

/** Anything the parent typed on the emergency card fills the matching blanks here. */
function applyEmergencyDetails(data: AgreementData, emergency: EmergencyContext): AgreementData {
  const filled = { ...data };
  if (!filled.workAddress && emergency.homeAddress) filled.workAddress = emergency.homeAddress;
  if (!filled.employerAddress && emergency.homeAddress) {
    filled.employerAddress = emergency.homeAddress;
  }
  return filled;
}

export async function loadAgreement(slug: string): Promise<AgreementView | null> {
  const access = await accessLevel(slug);
  if (!access) return null;
  const family = await familyBySlug(slug);
  if (!family) return null;

  const [{ data: agreement }, { data: sigs }, emergency] = await Promise.all([
    supabaseAdmin.from("nanny_agreements").select("*").eq("family_id", family.id).maybeSingle(),
    supabaseAdmin
      .from("document_signatures")
      .select("doc_kind, signer_role, signer_name, doc_version, signed_at")
      .eq("family_id", family.id)
      .order("signed_at", { ascending: false }),
    loadEmergencyContext(family.id),
  ]);

  const status = (agreement?.status as "draft" | "issued") ?? "draft";
  const base = agreement
    ? withLegacyNotes(agreement.agreement_data)
    : {
        ...defaultAgreementData,
        employerName: family.family_name,
        nannyName: family.nanny_name ?? "",
        startDate: family.start_date ?? "",
      };
  const data = applyEmergencyDetails(base, emergency);

  return {
    familyName: family.family_name,
    status,
    version: agreement?.version ?? 1,
    issuedAt: agreement?.issued_at ?? null,
    updatedAt: agreement?.updated_at ?? null,
    data,
    hasContent: agreementHasContent(data),
    signatures: mapSignatures(sigs),
    access,
    emergency,
  };
}

/** Families build their own agreement from inside the wallet. */
export async function saveAgreementFromWallet(
  slug: string,
  input: AgreementData,
  publish: boolean,
) {
  if (!(await isUnlocked(slug))) return { ok: false as const, reason: "locked" as const };
  const family = await familyBySlug(slug);
  if (!family) return { ok: false as const, reason: "locked" as const };
  await adminSaveAgreement(family.id, input, publish);
  return { ok: true as const };
}

export async function loadSignatures(slug: string) {
  if (!(await isUnlocked(slug))) return null;
  const family = await familyBySlug(slug);
  if (!family) return null;
  const { data } = await supabaseAdmin
    .from("document_signatures")
    .select("doc_kind, signer_role, signer_name, doc_version, signed_at")
    .eq("family_id", family.id)
    .order("signed_at", { ascending: false });
  return {
    familyName: family.family_name,
    signatures: mapSignatures(data),
    termsVersion: TERMS_VERSION,
  };
}

export async function signDocument(
  slug: string,
  docKind: "agreement" | "terms",
  signerRole: "parent" | "nanny",
  signerName: string,
) {
  const access = await accessLevel(slug);
  if (!access) return { ok: false as const, reason: "locked" as const };
  // An invited nanny may sign as the nanny only.
  if (signerRole === "parent" && access !== "family") {
    return { ok: false as const, reason: "locked" as const };
  }
  const name = clean(signerName, 120);
  if (!name || name.length < 3) return { ok: false as const, reason: "name" as const };

  const family = await familyBySlug(slug);
  if (!family) return { ok: false as const, reason: "locked" as const };

  let docVersion = TERMS_VERSION;
  if (docKind === "agreement") {
    const { data: agreement } = await supabaseAdmin
      .from("nanny_agreements")
      .select("version, status")
      .eq("family_id", family.id)
      .maybeSingle();
    if (!agreement || agreement.status !== "issued") {
      return { ok: false as const, reason: "not_ready" as const };
    }
    docVersion = String(agreement.version);
  }

  const { error } = await supabaseAdmin.from("document_signatures").insert({
    family_id: family.id,
    doc_kind: docKind,
    signer_role: signerRole,
    signer_name: name,
    doc_version: docVersion,
    client_key: clientKey(),
  });
  if (error) return { ok: false as const, reason: "error" as const };

  if (docKind === "terms") {
    await supabaseAdmin
      .from("families")
      .update({ terms_accepted_on: new Date().toISOString().slice(0, 10) })
      .eq("id", family.id);
  }

  return { ok: true as const };
}

/* ---------------- Admin-facing ---------------- */

export async function adminLoadAgreement(familyId: string) {
  const [{ data: family }, { data: agreement }, { data: sigs }] = await Promise.all([
    supabaseAdmin
      .from("families")
      .select("id, slug, family_name, nanny_name, start_date")
      .eq("id", familyId)
      .maybeSingle(),
    supabaseAdmin.from("nanny_agreements").select("*").eq("family_id", familyId).maybeSingle(),
    supabaseAdmin
      .from("document_signatures")
      .select("doc_kind, signer_role, signer_name, doc_version, signed_at")
      .eq("family_id", familyId)
      .order("signed_at", { ascending: false }),
  ]);

  if (!family) throw new Error("Family not found");

  const data = agreement
    ? withLegacyNotes(agreement.agreement_data)
    : {
        ...defaultAgreementData,
        employerName: family.family_name,
        nannyName: family.nanny_name ?? "",
        startDate: family.start_date ?? "",
      };

  return {
    family: { id: family.id, slug: family.slug, familyName: family.family_name },
    status: (agreement?.status as "draft" | "issued") ?? "draft",
    version: agreement?.version ?? 1,
    issuedAt: agreement?.issued_at ?? null,
    data,
    signatures: mapSignatures(sigs),
  };
}

/** Keep the legacy flat columns roughly in step so nothing downstream goes blank. */
function legacyColumns(data: AgreementData) {
  return {
    employer_names: clean(data.employerName, 500),
    nanny_name: clean(data.nannyName, 200),
    start_date: clean(data.startDate, 20),
    hourly_rate: clean(data.hourlyRate, 200),
    pay_basis: clean(data.paymentFrequency, 200),
    probation: clean(data.probationPeriod),
    notice_period: clean(data.standardNotice),
    holiday: clean(data.holidayAllowance),
    pension: clean(data.pension),
    duties: clean(data.otherDutiesClause),
    work_pattern: clean(data.overtimePolicy),
  };
}

export async function adminSaveAgreement(
  familyId: string,
  input: AgreementData,
  publish: boolean,
) {
  const data = normalizeAgreement(input);

  const { data: existing } = await supabaseAdmin
    .from("nanny_agreements")
    .select("id, version, status, agreement_data")
    .eq("family_id", familyId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabaseAdmin.from("nanny_agreements").insert({
      family_id: familyId,
      ...legacyColumns(data),
      agreement_data: data as unknown as Json,
      status: publish ? "issued" : "draft",
      version: 1,
      issued_at: publish ? new Date().toISOString() : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  }

  // Only start a new version when the wording actually changed, otherwise
  // re-saving an already-issued agreement would wipe out existing signatures.
  const contentChanged =
    JSON.stringify(normalizeAgreement(existing.agreement_data)) !== JSON.stringify(data);
  const bumpVersion = publish && existing.status === "issued" && contentChanged;
  const { error } = await supabaseAdmin
    .from("nanny_agreements")
    .update({
      ...legacyColumns(data),
      agreement_data: data as unknown as Json,
      status: publish ? "issued" : existing.status,
      version: bumpVersion ? existing.version + 1 : existing.version,
      ...(publish && (existing.status !== "issued" || bumpVersion)
        ? { issued_at: new Date().toISOString() }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function adminSign(familyId: string, docKind: "agreement" | "terms", name: string) {
  const signerName = clean(name, 120);
  if (!signerName) throw new Error("Name required");

  let docVersion = TERMS_VERSION;
  if (docKind === "agreement") {
    const { data: agreement } = await supabaseAdmin
      .from("nanny_agreements")
      .select("version")
      .eq("family_id", familyId)
      .maybeSingle();
    docVersion = String(agreement?.version ?? 1);
  }

  const { error } = await supabaseAdmin.from("document_signatures").insert({
    family_id: familyId,
    doc_kind: docKind,
    signer_role: "agency",
    signer_name: signerName,
    doc_version: docVersion,
  });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
