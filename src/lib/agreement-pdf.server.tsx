import { renderToStaticMarkup } from "react-dom/server";

import { AgreementDocument } from "@/components/AgreementDocument";
import { SelfEmployedDocument } from "@/components/SelfEmployedDocument";
import { StatementDocument } from "@/components/StatementDocument";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeAgreement } from "./agreement.model";
import { signedCopyPath } from "./agreement-versions";
import { htmlToBlocks, textToPdf, type PdfBlock } from "./simple-pdf";

const BUCKET = "family-docs";

/**
 * Saves a record copy of an issued agreement version, as a PDF in the household's vault, once both the parent and the
 * nanny have signed that exact version. The wording comes from the stored version, never from the editable working copy.
 */
export async function saveSignedCopy(versionId: string) {
  const { data: version } = await supabaseAdmin
    .from("agreement_versions")
    .select("id, family_id, nanny_id, version, snapshot_text, content_hash, issued_at")
    .eq("id", versionId)
    .maybeSingle();
  if (!version) return { saved: false as const, reason: "no_version" as const };

  const path = signedCopyPath(version.family_id, version.id);
  const { data: existing } = await supabaseAdmin.from("wallet_documents").select("id").eq("storage_path", path).maybeSingle();
  if (existing) return { saved: false as const, reason: "already_saved" as const };

  const { data: sigs } = await supabaseAdmin
    .from("document_signatures")
    .select("signer_role, signer_name, signed_at")
    .eq("agreement_version_id", version.id)
    .order("signed_at", { ascending: true });
  const roles = new Set((sigs ?? []).map((s) => s.signer_role));
  if (!roles.has("parent") || !roles.has("nanny")) return { saved: false as const, reason: "not_fully_signed" as const };

  const { data: family } = await supabaseAdmin.from("families").select("family_name").eq("id", version.family_id).maybeSingle();
  const data = normalizeAgreement(JSON.parse(version.snapshot_text));
  const Document = data.documentStyle === "self_employed" ? SelfEmployedDocument : data.documentStyle === "statement" ? StatementDocument : AgreementDocument;
  const html = renderToStaticMarkup(<Document data={data} version={version.version} issuedAt={version.issued_at} familyName={family?.family_name ?? ""} />);

  const signatures: PdfBlock[] = (sigs ?? []).map((s) => ({ kind: "li", text: `${s.signer_name} (${s.signer_role}) signed on ${s.signed_at.slice(0, 10)} at ${s.signed_at.slice(11, 16)} UTC` }));
  const blocks: PdfBlock[] = [
    { kind: "h1", text: "Signed record copy" },
    { kind: "p", text: `Agreement version ${version.version}, issued ${version.issued_at.slice(0, 10)}. Saved from the wording stored when it was issued.` },
    { kind: "rule" },
    ...htmlToBlocks(html),
    { kind: "rule" },
    { kind: "h2", text: "Signatures" },
    ...signatures,
    { kind: "gap" },
    { kind: "p", text: `Fingerprint (SHA-256 of the stored wording): ${version.content_hash}` },
    { kind: "p", text: "This is a plain-text record copy for your files. It does not replace independent legal advice." },
  ];
  const bytes = textToPdf(blocks, { title: `Signed agreement, version ${version.version}` });

  const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await supabaseAdmin.from("wallet_documents").insert({
    family_id: version.family_id,
    nanny_id: version.nanny_id,
    category: "agreement",
    title: `Signed agreement, version ${version.version}`,
    file_name: `signed-agreement-v${version.version}.pdf`,
    content_type: "application/pdf",
    size_bytes: bytes.length,
    storage_path: path,
    shared_with_staff: false,
    uploaded_by: "family",
  });
  if (error) {
    await supabaseAdmin.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }
  const { audit } = await import("./audit.server");
  await audit({ actorKind: "system", action: "signed_copy_saved", familyId: version.family_id, meta: { version: version.version } });
  return { saved: true as const };
}

/** For use right after a signature: a failure here is logged and never stops the signing. */
export async function trySaveSignedCopy(versionId: string | null | undefined) {
  if (!versionId) return;
  try {
    await saveSignedCopy(versionId);
  } catch (error) {
    console.error("Could not save the signed copy", error instanceof Error ? error.message : error);
  }
}
