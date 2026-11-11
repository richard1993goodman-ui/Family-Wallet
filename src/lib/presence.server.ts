import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sessionAccess } from "./wallet.server";

const ONLINE_MS = 2 * 60 * 1000;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const signed = async (path: string | null) => {
  if (!path) return null;
  const { data } = await supabaseAdmin.storage.from("family-docs").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
};
const online = (at: string | null) => !!at && Date.now() - new Date(at).getTime() < ONLINE_MS;

async function familyId(slug: string) {
  const { data } = await supabaseAdmin.from("families").select("id").eq("slug", slug).eq("status", "active").maybeSingle();
  return data?.id ?? null;
}

/** Marks whoever is signed in on this device as online. The shared demo wallet is never written to. */
export async function heartbeat(slug: string) {
  if (slug === "demo") return;
  const access = await sessionAccess(slug);
  if (!access) return;
  const now = new Date().toISOString();
  if (access.level === "family") {
    await supabaseAdmin.from("families").update({ parent_last_seen_at: now }).eq("slug", slug);
  } else if (access.nannyId) {
    await supabaseAdmin.from("family_nannies").update({ last_seen_at: now }).eq("id", access.nannyId);
  }
}

/** The parent and each active nanny, with headshot and whether they are online right now. */
export async function loadPeople(slug: string) {
  const access = await sessionAccess(slug);
  if (!access) return null;
  const { data: family } = await supabaseAdmin
    .from("families")
    .select("id, family_name, parent_photo_path, parent_last_seen_at")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!family) return null;
  const { data: nannies } = await supabaseAdmin
    .from("family_nannies")
    .select("id, name, photo_path, last_seen_at")
    .eq("family_id", family.id)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  const parent = {
    key: "parent",
    name: family.family_name,
    photoUrl: await signed(family.parent_photo_path),
    online: online(family.parent_last_seen_at),
    isYou: access.level === "family",
  };
  const nannyList = await Promise.all(
    (nannies ?? []).map(async (n) => ({
      key: n.id,
      name: n.name,
      photoUrl: await signed(n.photo_path),
      // The sample wallet shows the nanny as online so visitors can see what the red dot means.
      online: slug === "demo" ? true : online(n.last_seen_at),
      isYou: access.level === "nanny" && access.nannyId === n.id,
    })),
  );
  return { people: [parent, ...nannyList] };
}

/** Sets the headshot for whoever is signed in: the parent, or the nanny signed in on this device. */
export async function saveMyPhoto(slug: string, contentType: string, base64: string) {
  if (slug === "demo") throw new Error("The demo wallet can't be changed.");
  const access = await sessionAccess(slug);
  if (!access) throw new Error("Please unlock the wallet first.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) throw new Error("Please choose a JPG, PNG or WebP photo.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) throw new Error("Photo must be under 2MB.");
  const id = await familyId(slug);
  if (!id) throw new Error("Wallet not found.");

  const owner = access.level === "family" ? "parent" : `nanny-${access.nannyId}`;
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `${id}/headshot-${owner}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabaseAdmin.storage.from("family-docs").upload(path, bytes, { contentType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { error } =
    access.level === "family"
      ? await supabaseAdmin.from("families").update({ parent_photo_path: path }).eq("id", id)
      : await supabaseAdmin.from("family_nannies").update({ photo_path: path, updated_at: new Date().toISOString() }).eq("id", access.nannyId!).eq("family_id", id);
  if (error) throw new Error(error.message);
}
