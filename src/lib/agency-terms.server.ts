import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AgencyTermsFile = { fileName: string; version: number; uploadedAt: string; url: string | null };

async function row(agencyId: string | null) {
  let q = supabaseAdmin.from("agency_terms").select("storage_path, file_name, version, uploaded_at");
  q = agencyId ? q.eq("agency_id", agencyId) : q.is("agency_id", null);
  const { data } = await q.maybeSingle();
  return data ?? null;
}

/** The terms uploaded by the agency that runs this family (null agency = owner). */
export async function termsForFamily(familyId: string): Promise<AgencyTermsFile | null> {
  const { data: fam } = await supabaseAdmin.from("families").select("partner_agency_id").eq("id", familyId).maybeSingle();
  if (!fam) return null;
  return termsForAgency(fam.partner_agency_id ?? null);
}

export async function termsForAgency(agencyId: string | null): Promise<AgencyTermsFile | null> {
  const r = await row(agencyId);
  if (!r) return null;
  const { data } = await supabaseAdmin.storage.from("family-docs").createSignedUrl(r.storage_path, 600);
  return { fileName: r.file_name, version: r.version, uploadedAt: r.uploaded_at, url: data?.signedUrl ?? null };
}

export async function saveAgencyTerms(agencyId: string | null, fileName: string, contentType: string, base64: string) {
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > 10 * 1024 * 1024) throw new Error("File must be under 10MB");
  if (contentType !== "application/pdf") throw new Error("Please upload a PDF");
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `agency-terms/${agencyId ?? "owner"}/${Date.now()}-${safe}`;
  const { error: upErr } = await supabaseAdmin.storage.from("family-docs").upload(path, bytes, { contentType, upsert: true });
  if (upErr) throw new Error(upErr.message);
  const existing = await row(agencyId);
  if (existing) {
    let q = supabaseAdmin.from("agency_terms").update({ storage_path: path, file_name: fileName, version: existing.version + 1, uploaded_at: new Date().toISOString() });
    q = agencyId ? q.eq("agency_id", agencyId) : q.is("agency_id", null);
    const { error } = await q;
    if (error) throw new Error(error.message);
    await supabaseAdmin.storage.from("family-docs").remove([existing.storage_path]);
  } else {
    const { error } = await supabaseAdmin.from("agency_terms").insert({ agency_id: agencyId, storage_path: path, file_name: fileName });
    if (error) throw new Error(error.message);
  }
}

export async function removeAgencyTerms(agencyId: string | null) {
  const existing = await row(agencyId);
  if (!existing) return;
  let q = supabaseAdmin.from("agency_terms").delete();
  q = agencyId ? q.eq("agency_id", agencyId) : q.is("agency_id", null);
  await q;
  await supabaseAdmin.storage.from("family-docs").remove([existing.storage_path]);
}
