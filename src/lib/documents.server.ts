import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { sessionAccess } from "./wallet.server";
import {
  ALLOWED_DOCUMENT_TYPES,
  categoryLabel,
  isDocumentCategory,
  matchesFileType,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS_PER_FAMILY,
  type VaultDocument,
} from "./documents.types";

const BUCKET = "family-docs";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Who is asking: the household (parents) or one named staff member. Null when nobody is signed in. */
async function who(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const session = await sessionAccess(slug);
  return { family, level: family.access, nannyId: session?.nannyId ?? null };
}

type Row = {
  id: string;
  nanny_id: string | null;
  category: string;
  title: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  storage_path: string;
  issued_on: string | null;
  expires_on: string | null;
  shared_with_staff: boolean;
  uploaded_by: string;
  uploaded_by_nanny_id: string | null;
  created_at: string;
};

/** What this person may open: parents see everything; staff see their own and what the household shares. */
const visible = (row: Row, me: { level: "family" | "nanny"; nannyId: string | null }) =>
  me.level === "family" || row.nanny_id === me.nannyId || (row.nanny_id === null && row.shared_with_staff);

const canDelete = (row: Row, me: { level: "family" | "nanny"; nannyId: string | null }) =>
  me.level === "family" || (row.uploaded_by === "nanny" && row.uploaded_by_nanny_id === me.nannyId && me.nannyId !== null);

export async function listDocuments(slug: string) {
  const me = await who(slug);
  if (!me) return null;
  const [{ data: rows }, { data: nannies }] = await Promise.all([
    supabaseAdmin.from("wallet_documents").select("*").eq("family_id", me.family.id).order("created_at", { ascending: false }),
    supabaseAdmin.from("family_nannies").select("id, name, role").eq("family_id", me.family.id).eq("status", "active").order("sort_order", { ascending: true }),
  ]);
  const names = new Map((nannies ?? []).map((n) => [n.id, n.name]));
  const documents: VaultDocument[] = ((rows ?? []) as Row[])
    .filter((r) => visible(r, me))
    .map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      fileName: r.file_name,
      contentType: r.content_type,
      sizeBytes: r.size_bytes,
      issuedOn: r.issued_on,
      expiresOn: r.expires_on,
      sharedWithStaff: r.shared_with_staff,
      uploadedBy: r.uploaded_by === "nanny" ? "nanny" : "family",
      createdAt: r.created_at,
      ownerId: r.nanny_id,
      ownerName: r.nanny_id ? (names.get(r.nanny_id) ?? "Former staff") : me.family.family_name,
      canDelete: canDelete(r, me),
    }));

  // Who a document can be stored for: parents choose the household or anyone on the staff; staff only themselves.
  const people =
    me.level === "family"
      ? [{ id: null as string | null, name: me.family.family_name, household: true }, ...(nannies ?? []).map((n) => ({ id: n.id as string | null, name: n.name, household: false }))]
      : (nannies ?? []).filter((n) => n.id === me.nannyId).map((n) => ({ id: n.id as string | null, name: n.name, household: false }));
  return { access: me.level, familyName: me.family.family_name, documents, people };
}

export type UploadInput = {
  ownerId: string | null;
  category: string;
  title?: string;
  issuedOn?: string;
  expiresOn?: string;
  sharedWithStaff?: boolean;
  fileName: string;
  contentType: string;
  base64: string;
};

const cleanDate = (v: string | undefined) => {
  const t = (v ?? "").trim();
  if (!t) return null;
  if (!ISO.test(t) || Number.isNaN(Date.parse(`${t}T00:00:00Z`))) throw new Error("Check the dates you entered.");
  return t;
};

export async function uploadDocument(slug: string, input: UploadInput) {
  const me = await who(slug);
  if (!me) throw new Error("Please unlock your wallet first.");
  if (slug === "demo") throw new Error("The demo wallet can't store documents.");
  if (!isDocumentCategory(input.category)) throw new Error("Choose what kind of document this is.");

  // Parents can store documents for the household or any staff member; staff only for themselves.
  const ownerId = me.level === "family" ? input.ownerId : me.nannyId;
  if (me.level === "nanny" && (!ownerId || input.ownerId !== ownerId)) throw new Error("You can only add your own documents.");
  if (ownerId) {
    const { data: nanny } = await supabaseAdmin.from("family_nannies").select("id").eq("id", ownerId).eq("family_id", me.family.id).eq("status", "active").maybeSingle();
    if (!nanny) throw new Error("That person isn't in your household.");
  }

  const ext = ALLOWED_DOCUMENT_TYPES[input.contentType];
  if (!ext) throw new Error("Please upload a PDF, JPG, PNG or WebP file.");
  const bytes = Buffer.from(String(input.base64 ?? ""), "base64");
  if (bytes.length === 0) throw new Error("That file is empty.");
  if (bytes.length > MAX_DOCUMENT_BYTES) throw new Error("Files must be under 10MB.");
  if (!matchesFileType(input.contentType, bytes)) throw new Error("That file doesn't look like a real " + ext.toUpperCase() + ".");
  const issuedOn = cleanDate(input.issuedOn);
  const expiresOn = cleanDate(input.expiresOn);
  if (issuedOn && expiresOn && expiresOn < issuedOn) throw new Error("The expiry date should be after the issue date.");

  const { count } = await supabaseAdmin.from("wallet_documents").select("id", { count: "exact", head: true }).eq("family_id", me.family.id);
  if ((count ?? 0) >= MAX_DOCUMENTS_PER_FAMILY) throw new Error("This wallet has reached its document limit. Delete some you no longer need.");

  // The stored name is random, so nothing about the document or the person appears in the file path.
  const path = `vault/${me.family.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: input.contentType, upsert: false });
  if (uploadError) throw new Error("Couldn't store that file. Please try again.");

  const title = (input.title ?? "").trim().slice(0, 120) || categoryLabel(input.category);
  const { error } = await supabaseAdmin.from("wallet_documents").insert({
    family_id: me.family.id,
    nanny_id: ownerId,
    category: input.category,
    title,
    file_name: String(input.fileName ?? "document").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 160),
    content_type: input.contentType,
    size_bytes: bytes.length,
    storage_path: path,
    issued_on: issuedOn,
    expires_on: expiresOn,
    shared_with_staff: me.level === "family" && ownerId === null && input.sharedWithStaff === true,
    uploaded_by: me.level,
    uploaded_by_nanny_id: me.level === "nanny" ? me.nannyId : null,
  });
  if (error) {
    await supabaseAdmin.storage.from(BUCKET).remove([path]);
    throw new Error("Couldn't save that document.");
  }
  await (await import("./notifications.server")).notifyOther(me.family, "documents", "A document was added");
  return { ok: true as const };
}

async function ownRow(slug: string, id: string) {
  const me = await who(slug);
  if (!me) throw new Error("Please unlock your wallet first.");
  const { data } = await supabaseAdmin.from("wallet_documents").select("*").eq("id", id).eq("family_id", me.family.id).maybeSingle();
  const row = data as Row | null;
  if (!row || !visible(row, me)) throw new Error("Document not found.");
  return { me, row };
}

export async function deleteDocument(slug: string, id: string) {
  const { me, row } = await ownRow(slug, id);
  if (!canDelete(row, me)) throw new Error("Only the person who added this, or a parent, can delete it.");
  await supabaseAdmin.storage.from(BUCKET).remove([row.storage_path]);
  const { error } = await supabaseAdmin.from("wallet_documents").delete().eq("id", id);
  if (error) throw new Error("Couldn't delete that document.");
  return { ok: true as const };
}

/** A link that opens the file for one minute. Checked against who is asking every time. */
export async function documentLink(slug: string, id: string) {
  const { row } = await ownRow(slug, id);
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(row.storage_path, 60);
  if (!data?.signedUrl) throw new Error("Couldn't open that document.");
  return { url: data.signedUrl };
}
