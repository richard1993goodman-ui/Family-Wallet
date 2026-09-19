import { getRequest } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isUnlocked } from "./wallet.server";
import { TERMS_VERSION } from "./tiers";

export type AgreementFields = {
  employerNames: string | null;
  nannyName: string | null;
  startDate: string | null;
  workPattern: string | null;
  hours: string | null;
  hourlyRate: string | null;
  payBasis: string | null;
  holiday: string | null;
  noticePeriod: string | null;
  probation: string | null;
  duties: string | null;
  pension: string | null;
  additionalTerms: string | null;
};

export type Signature = {
  docKind: "agreement" | "terms";
  signerRole: "parent" | "nanny" | "agency";
  signerName: string;
  docVersion: string;
  signedAt: string;
};

export type AgreementView = {
  familyName: string;
  status: "draft" | "issued";
  version: number;
  issuedAt: string | null;
  updatedAt: string | null;
  fields: AgreementFields;
  signatures: Signature[];
};

const MAX = 6000;

function clean(value: string | undefined | null, max = MAX) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function clientKey() {
  try {
    const request = getRequest();
    const forwarded = request.headers.get("x-forwarded-for") ?? "";
    return (forwarded.split(",")[0] || request.headers.get("cf-connecting-ip") || "unknown").trim();
  } catch {
    return "unknown";
  }
}

function mapFields(row: Record<string, unknown> | null): AgreementFields {
  const get = (key: string) => ((row?.[key] as string | null) ?? null);
  return {
    employerNames: get("employer_names"),
    nannyName: get("nanny_name"),
    startDate: get("start_date"),
    workPattern: get("work_pattern"),
    hours: get("hours"),
    hourlyRate: get("hourly_rate"),
    payBasis: get("pay_basis"),
    holiday: get("holiday"),
    noticePeriod: get("notice_period"),
    probation: get("probation"),
    duties: get("duties"),
    pension: get("pension"),
    additionalTerms: get("additional_terms"),
  };
}

function toRow(fields: AgreementFields) {
  return {
    employer_names: clean(fields.employerNames),
    nanny_name: clean(fields.nannyName, 200),
    start_date: clean(fields.startDate, 20),
    work_pattern: clean(fields.workPattern),
    hours: clean(fields.hours),
    hourly_rate: clean(fields.hourlyRate, 200),
    pay_basis: clean(fields.payBasis, 200),
    holiday: clean(fields.holiday),
    notice_period: clean(fields.noticePeriod),
    probation: clean(fields.probation),
    duties: clean(fields.duties),
    pension: clean(fields.pension),
    additional_terms: clean(fields.additionalTerms),
  };
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

/* ---------------- Family-facing (wallet unlocked) ---------------- */

export async function loadAgreement(slug: string): Promise<AgreementView | null> {
  if (!(await isUnlocked(slug))) return null;
  const family = await familyBySlug(slug);
  if (!family) return null;

  const [{ data: agreement }, { data: sigs }] = await Promise.all([
    supabaseAdmin.from("nanny_agreements").select("*").eq("family_id", family.id).maybeSingle(),
    supabaseAdmin
      .from("document_signatures")
      .select("doc_kind, signer_role, signer_name, doc_version, signed_at")
      .eq("family_id", family.id)
      .order("signed_at", { ascending: false }),
  ]);

  const status = (agreement?.status as "draft" | "issued") ?? "draft";

  return {
    familyName: family.family_name,
    status,
    version: agreement?.version ?? 1,
    issuedAt: agreement?.issued_at ?? null,
    updatedAt: agreement?.updated_at ?? null,
    fields: status === "issued" ? mapFields(agreement) : mapFields(null),
    signatures: mapSignatures(sigs),
  };
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
  return { familyName: family.family_name, signatures: mapSignatures(data), termsVersion: TERMS_VERSION };
}

export async function signDocument(
  slug: string,
  docKind: "agreement" | "terms",
  signerRole: "parent" | "nanny",
  signerName: string,
) {
  if (!(await isUnlocked(slug))) return { ok: false as const, reason: "locked" as const };
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

  const fields = mapFields(agreement);
  return {
    family: { id: family.id, slug: family.slug, familyName: family.family_name },
    status: (agreement?.status as "draft" | "issued") ?? "draft",
    version: agreement?.version ?? 1,
    issuedAt: agreement?.issued_at ?? null,
    fields: agreement
      ? fields
      : { ...fields, nannyName: family.nanny_name, startDate: family.start_date },
    signatures: mapSignatures(sigs),
  };
}

export async function adminSaveAgreement(
  familyId: string,
  fields: AgreementFields,
  publish: boolean,
) {
  const { data: existing } = await supabaseAdmin
    .from("nanny_agreements")
    .select("id, version, status")
    .eq("family_id", familyId)
    .maybeSingle();

  const row = toRow(fields);

  if (!existing) {
    const { error } = await supabaseAdmin.from("nanny_agreements").insert({
      family_id: familyId,
      ...row,
      status: publish ? "issued" : "draft",
      version: 1,
      issued_at: publish ? new Date().toISOString() : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  }

  const bumpVersion = publish && existing.status === "issued";
  const { error } = await supabaseAdmin
    .from("nanny_agreements")
    .update({
      ...row,
      status: publish ? "issued" : existing.status,
      version: bumpVersion ? existing.version + 1 : existing.version,
      issued_at: publish ? new Date().toISOString() : null,
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
