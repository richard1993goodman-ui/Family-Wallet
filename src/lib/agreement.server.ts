import { familyHasFeature } from "./plan-access.server";
import { UPGRADE_MESSAGE } from "./plan-access";
import { getRequest } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { isUnlocked, listNannyRows, sessionAccess } from "./wallet.server";
import { snapshotAgreement } from "./agreement-versions";
import { TERMS_VERSION } from "./tiers";
import { termsForFamily } from "./agency-terms.server";
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

export type AgreementHistoryEntry = {
  version: number;
  issuedAt: string;
  /** First characters of the stored wording's SHA-256, so a version can be told apart and checked. */
  fingerprint: string;
  signatures: { role: string; name: string; at: string }[];
};

export type AgreementView = {
  familyName: string;
  status: "draft" | "issued";
  version: number;
  issuedAt: string | null;
  updatedAt: string | null;
  data: AgreementData;
  hasContent: boolean;
  /** Edits to an issued agreement that have not been issued yet. The signed wording in `data` is untouched. */
  pendingChanges: AgreementData | null;
  history: AgreementHistoryEntry[];
  signatures: Signature[];
  access: "family" | "nanny";
  emergency: EmergencyContext;
  nannyId: string | null;
  nannyName: string | null;
  nannies: { id: string; name: string }[];
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

/** Work out which nanny's agreement we're looking at: the signed-in nanny's own, or the one the parent picked. */
async function resolveNanny(slug: string, requestedId?: string | null) {
  const session = await sessionAccess(slug);
  if (!session) return null;
  const family = await familyBySlug(slug);
  if (!family) return null;
  const rows = await listNannyRows(family.id);
  const nannyId =
    session.level === "nanny"
      ? session.nannyId
      : requestedId && rows.some((r) => r.id === requestedId)
        ? requestedId
        : (rows[0]?.id ?? null);
  return {
    access: session.level,
    family,
    nannies: rows.map((r) => ({ id: r.id, name: r.name })),
    nannyId,
    nannyName: rows.find((r) => r.id === nannyId)?.name ?? null,
  };
}

async function agreementSignatures(familyId: string, nannyId: string | null) {
  const { data } = await supabaseAdmin
    .from("document_signatures")
    .select("doc_kind, signer_role, signer_name, doc_version, signed_at, nanny_id")
    .eq("family_id", familyId)
    .order("signed_at", { ascending: false });
  return mapSignatures(
    (data ?? []).filter((row) => row.doc_kind !== "agreement" || row.nanny_id === nannyId),
  );
}

export async function loadAgreement(
  slug: string,
  requestedNannyId?: string | null,
): Promise<AgreementView | null> {
  const resolved = await resolveNanny(slug, requestedNannyId);
  if (!resolved) return null;
  const { family, access, nannyId, nannyName, nannies } = resolved;
  if (!(await familyHasFeature(family.id, "agreement"))) throw new Error(UPGRADE_MESSAGE);

  const [{ data: agreement }, signatures, emergency] = await Promise.all([
    nannyId
      ? supabaseAdmin
          .from("nanny_agreements")
          .select("*")
          .eq("family_id", family.id)
          .eq("nanny_id", nannyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    agreementSignatures(family.id, nannyId),
    loadEmergencyContext(family.id),
  ]);

  const status = (agreement?.status as "draft" | "issued") ?? "draft";
  const base = agreement
    ? withLegacyNotes(agreement.agreement_data)
    : {
        ...defaultAgreementData,
        employerName: family.family_name,
        nannyName: nannyName ?? "",
        startDate: family.start_date ?? "",
      };
  const data = applyEmergencyDetails(base, emergency);
  const pendingChanges = agreement?.draft_data ? applyEmergencyDetails(withLegacyNotes(agreement.draft_data), emergency) : null;

  return {
    familyName: family.family_name,
    status,
    version: agreement?.version ?? 1,
    issuedAt: agreement?.issued_at ?? null,
    updatedAt: agreement?.updated_at ?? null,
    data,
    hasContent: agreementHasContent(data),
    pendingChanges,
    history: await agreementHistory(agreement?.id ?? null),
    signatures,
    access,
    emergency,
    nannyId,
    nannyName,
    nannies,
  };
}

/** Families build their own agreement from inside the wallet. */
export async function saveAgreementFromWallet(
  slug: string,
  input: AgreementData,
  publish: boolean,
  nannyId?: string | null,
) {
  if (!(await isUnlocked(slug))) return { ok: false as const, reason: "locked" as const };
  const resolved = await resolveNanny(slug, nannyId);
  if (!resolved || !resolved.nannyId) return { ok: false as const, reason: "locked" as const };
  if (!(await familyHasFeature(resolved.family.id, "agreement"))) throw new Error(UPGRADE_MESSAGE);
  await adminSaveAgreement(resolved.family.id, input, publish, resolved.nannyId);
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
    terms: await termsForFamily(family.id),
    termsVersion: (await termsForFamily(family.id))?.version.toString() ?? TERMS_VERSION,
  };
}

/** Every issued version of an agreement, newest first, with who signed each. */
async function agreementHistory(agreementId: string | null): Promise<AgreementHistoryEntry[]> {
  if (!agreementId) return [];
  const { data: versions } = await supabaseAdmin
    .from("agreement_versions")
    .select("id, version, issued_at, content_hash")
    .eq("agreement_id", agreementId)
    .order("version", { ascending: false });
  if (!versions?.length) return [];
  const { data: sigs } = await supabaseAdmin
    .from("document_signatures")
    .select("agreement_version_id, signer_role, signer_name, signed_at")
    .in("agreement_version_id", versions.map((v) => v.id))
    .order("signed_at", { ascending: true });
  return versions.map((v) => ({
    version: v.version,
    issuedAt: v.issued_at,
    fingerprint: v.content_hash.slice(0, 12),
    signatures: (sigs ?? []).filter((x) => x.agreement_version_id === v.id).map((x) => ({ role: x.signer_role, name: x.signer_name, at: x.signed_at })),
  }));
}

/** Keeps the agreement exactly as issued. Re-issuing the same version is a no-op; history is never rewritten. */
async function recordIssuedVersion(row: { id: string; family_id: string; nanny_id: string | null; version: number }, data: unknown) {
  const { text, hash } = snapshotAgreement(data);
  const { error } = await supabaseAdmin.from("agreement_versions").insert({
    agreement_id: row.id,
    family_id: row.family_id,
    nanny_id: row.nanny_id,
    version: row.version,
    snapshot_text: text,
    content_hash: hash,
  });
  if (error && error.code !== "23505") throw new Error(error.message);
}

/**
 * What a signature should record for this agreement version: the stored version and its hash. Returns "edited" when
 * the wording now on screen differs from what was issued, and null when no version record exists yet (older rows).
 */
async function issuedEvidence(agreementId: string, version: number, live: unknown) {
  const { data } = await supabaseAdmin
    .from("agreement_versions")
    .select("id, snapshot_text, content_hash")
    .eq("agreement_id", agreementId)
    .eq("version", version)
    .maybeSingle();
  if (!data) return null;
  const issued = snapshotAgreement(normalizeAgreement(JSON.parse(data.snapshot_text) as AgreementData)).text;
  if (issued !== snapshotAgreement(normalizeAgreement(live as AgreementData)).text) return "edited" as const;
  return { versionId: data.id, hash: data.content_hash };
}

type Evidence = Awaited<ReturnType<typeof issuedEvidence>>;
const fingerprintOf = (e: Evidence) => (e && e !== "edited" ? e.hash.slice(0, 12) : null);
const evidenceFields = (e: Evidence) => (e && e !== "edited" ? { agreement_version_id: e.versionId, content_hash: e.hash } : {});

export async function signDocument(
  slug: string,
  docKind: "agreement" | "terms",
  signerRole: "parent" | "nanny",
  signerName: string,
  nannyId?: string | null,
) {
  const resolved = await resolveNanny(slug, nannyId);
  if (!resolved) return { ok: false as const, reason: "locked" as const };
  const { access, family } = resolved;
  if (docKind === "agreement" && !(await familyHasFeature(family.id, "agreement"))) throw new Error(UPGRADE_MESSAGE);
  // An invited nanny may sign as the nanny only.
  if (signerRole === "parent" && access !== "family") {
    return { ok: false as const, reason: "locked" as const };
  }
  const name = clean(signerName, 120);
  if (!name || name.length < 3) return { ok: false as const, reason: "name" as const };

  let docVersion = TERMS_VERSION;
  if (docKind === "terms") {
    const t = await termsForFamily(family.id);
    if (!t) return { ok: false as const, reason: "not_ready" as const };
    docVersion = String(t.version);
  }
  let signedNannyId: string | null = null;
  let evidence: Awaited<ReturnType<typeof issuedEvidence>> = null;
  if (docKind === "agreement") {
    if (!resolved.nannyId) return { ok: false as const, reason: "not_ready" as const };
    signedNannyId = resolved.nannyId;
    const { data: agreement } = await supabaseAdmin
      .from("nanny_agreements")
      .select("id, version, status, agreement_data")
      .eq("family_id", family.id)
      .eq("nanny_id", resolved.nannyId)
      .maybeSingle();
    if (!agreement || agreement.status !== "issued") {
      return { ok: false as const, reason: "not_ready" as const };
    }
    docVersion = String(agreement.version);
    evidence = await issuedEvidence(agreement.id, agreement.version, agreement.agreement_data);
    // The wording on screen has been edited since it was issued: it must be re-issued before anyone signs it.
    if (evidence === "edited") return { ok: false as const, reason: "not_ready" as const };
  }

  const { error } = await supabaseAdmin.from("document_signatures").insert({
    family_id: family.id,
    nanny_id: signedNannyId,
    doc_kind: docKind,
    signer_role: signerRole,
    signer_name: name,
    doc_version: docVersion,
    client_key: clientKey(),
    ...evidenceFields(evidence),
  });
  if (error) return { ok: false as const, reason: "error" as const };
  if (docKind === "agreement") {
    const { audit } = await import("./audit.server");
    await audit({ actorKind: signerRole === "nanny" ? "nanny" : "parent", action: "agreement_signed", familyId: family.id, meta: { version: docVersion, fingerprint: fingerprintOf(evidence) } });
  }

  if (docKind === "terms") {
    await supabaseAdmin
      .from("families")
      .update({ terms_accepted_on: new Date().toISOString().slice(0, 10) })
      .eq("id", family.id);
  }

  return { ok: true as const };
}

/* ---------------- Admin-facing ---------------- */

export async function adminLoadAgreement(familyId: string, requestedNannyId?: string | null) {
  const [{ data: family }, nannyRows] = await Promise.all([
    supabaseAdmin
      .from("families")
      .select("id, slug, family_name, nanny_name, start_date")
      .eq("id", familyId)
      .maybeSingle(),
    listNannyRows(familyId),
  ]);

  if (!family) throw new Error("Family not found");

  const nannies = nannyRows.map((r) => ({ id: r.id, name: r.name }));
  const nannyId =
    requestedNannyId && nannies.some((n) => n.id === requestedNannyId)
      ? requestedNannyId
      : (nannies[0]?.id ?? null);

  const [{ data: agreement }, { data: sigs }] = await Promise.all([
    nannyId
      ? supabaseAdmin
          .from("nanny_agreements")
          .select("*")
          .eq("family_id", familyId)
          .eq("nanny_id", nannyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin
      .from("document_signatures")
      .select("doc_kind, signer_role, signer_name, doc_version, signed_at, nanny_id")
      .eq("family_id", familyId)
      .order("signed_at", { ascending: false }),
  ]);

  const data = agreement
    ? withLegacyNotes(agreement.draft_data ?? agreement.agreement_data)
    : {
        ...defaultAgreementData,
        employerName: family.family_name,
        nannyName: nannies.find((n) => n.id === nannyId)?.name ?? family.nanny_name ?? "",
        startDate: family.start_date ?? "",
      };

  return {
    family: { id: family.id, slug: family.slug, familyName: family.family_name },
    nannies,
    nannyId,
    nannyName: nannies.find((n) => n.id === nannyId)?.name ?? null,
    status: (agreement?.status as "draft" | "issued") ?? "draft",
    version: agreement?.version ?? 1,
    issuedAt: agreement?.issued_at ?? null,
    data,
    signatures: mapSignatures(
      (sigs ?? []).filter((row) => row.doc_kind !== "agreement" || row.nanny_id === nannyId),
    ),
  };
}

/** Keep the legacy flat columns roughly in step so nothing downstream goes blank. */
function legacyColumns(data: AgreementData) {
  return {
    employer_names: clean(data.employerName, 500),
    nanny_name: clean(data.nannyName, 200),
    start_date: clean(data.startDate, 20),
    hourly_rate: clean(
      data.hourlyRate ? `${data.hourlyRate} ${data.rateBasis === "net" ? "net" : "gross"}` : "",
      200,
    ),
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
  requestedNannyId?: string | null,
) {
  const data = normalizeAgreement(input);

  const rows = await listNannyRows(familyId);
  const nannyId =
    requestedNannyId && rows.some((r) => r.id === requestedNannyId)
      ? requestedNannyId
      : (rows[0]?.id ?? null);
  if (!nannyId) throw new Error("Add a nanny before building an agreement");

  const { data: existing } = await supabaseAdmin
    .from("nanny_agreements")
    .select("id, version, status, agreement_data")
    .eq("family_id", familyId)
    .eq("nanny_id", nannyId)
    .maybeSingle();

  if (!existing) {
    const { data: created, error } = await supabaseAdmin
      .from("nanny_agreements")
      .insert({
        family_id: familyId,
        nanny_id: nannyId,
        ...legacyColumns(data),
        agreement_data: data as unknown as Json,
        status: publish ? "issued" : "draft",
        version: 1,
        issued_at: publish ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (publish) await recordIssuedVersion({ id: created.id, family_id: familyId, nanny_id: nannyId, version: 1 }, data);
    return { ok: true as const };
  }

  // Only start a new version when the wording actually changed, otherwise
  // re-saving an already-issued agreement would wipe out existing signatures.
  const contentChanged =
    JSON.stringify(normalizeAgreement(existing.agreement_data)) !== JSON.stringify(data);
  const bumpVersion = publish && existing.status === "issued" && contentChanged;

  // An issued agreement keeps the wording that was signed. Edits that are not being issued are held as pending
  // changes until they are issued again as a new version, so a signature always matches what was agreed.
  if (existing.status === "issued" && !publish) {
    const { error: pendingError } = await supabaseAdmin
      .from("nanny_agreements")
      .update({ draft_data: contentChanged ? (data as unknown as Json) : null, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (pendingError) throw new Error(pendingError.message);
    return { ok: true as const, pending: contentChanged };
  }

  const { error } = await supabaseAdmin
    .from("nanny_agreements")
    .update({
      ...legacyColumns(data),
      agreement_data: data as unknown as Json,
      status: publish ? "issued" : existing.status,
      ...(publish ? { draft_data: null } : {}),
      version: bumpVersion ? existing.version + 1 : existing.version,
      ...(publish && (existing.status !== "issued" || bumpVersion)
        ? { issued_at: new Date().toISOString() }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);
  // Issuing keeps this exact wording for ever. Nothing later can overwrite it.
  if (publish && (existing.status !== "issued" || bumpVersion)) {
    await recordIssuedVersion(
      { id: existing.id, family_id: familyId, nanny_id: nannyId, version: bumpVersion ? existing.version + 1 : existing.version },
      data,
    );
  }
  return { ok: true as const };
}

export async function adminSign(
  familyId: string,
  docKind: "agreement" | "terms",
  name: string,
  requestedNannyId?: string | null,
) {
  const signerName = clean(name, 120);
  if (!signerName) throw new Error("Name required");

  let docVersion = TERMS_VERSION;
  let nannyId: string | null = null;
  let adminEvidence: Awaited<ReturnType<typeof issuedEvidence>> = null;
  if (docKind === "agreement") {
    const rows = await listNannyRows(familyId);
    nannyId =
      requestedNannyId && rows.some((r) => r.id === requestedNannyId)
        ? requestedNannyId
        : (rows[0]?.id ?? null);
    const { data: agreement } = nannyId
      ? await supabaseAdmin
          .from("nanny_agreements")
          .select("id, version, agreement_data")
          .eq("family_id", familyId)
          .eq("nanny_id", nannyId)
          .maybeSingle()
      : { data: null };
    docVersion = String(agreement?.version ?? 1);
    if (agreement) {
      adminEvidence = await issuedEvidence(agreement.id, agreement.version, agreement.agreement_data);
      if (adminEvidence === "edited") throw new Error("This agreement was edited after it was issued. Issue it again before signing.");
    }
  }

  const { error } = await supabaseAdmin.from("document_signatures").insert({
    family_id: familyId,
    nanny_id: nannyId,
    doc_kind: docKind,
    signer_role: "agency",
    signer_name: signerName,
    doc_version: docVersion,
    ...evidenceFields(adminEvidence),
  });
  if (error) throw new Error(error.message);
  if (docKind === "agreement") {
    const { audit } = await import("./audit.server");
    await audit({ actorKind: "owner", action: "agreement_signed", familyId, meta: { version: docVersion, fingerprint: fingerprintOf(adminEvidence) } });
  }
  return { ok: true as const };
}
