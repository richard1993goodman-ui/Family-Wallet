import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import type { MomentsData, MomentInput, MomentPhotoInput, MomentRow } from "./moments.types";

export async function loadMoments(slug: string): Promise<MomentsData | null> {
  const family = await requireSharedFamily(slug);
  if (!family) return null;

  const [{ data: children }, { data: rows }] = await Promise.all([
    supabaseAdmin
      .from("family_children")
      .select("id, name")
      .eq("family_id", family.id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("family_moments")
      .select(
        "id, kind, moment_date, caption, milestone_label, child_id, added_by, added_by_name, storage_path, created_at",
      )
      .eq("family_id", family.id)
      .order("moment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  // The sample wallet shows a ready-made after-school feed, dated from today, instead of whatever was last seeded.
  if (slug === "demo") {
    const { demoMoments } = await import("./demo-photos");
    return {
      access: family.access,
      familyName: family.family_name,
      children: (children ?? []).map((c) => ({ id: c.id, name: c.name })),
      moments: demoMoments(),
    };
  }

  // Who has loved what. If the reactions table has not been added yet the feed simply shows no hearts.
  const { data: loves } = await supabaseAdmin.from("moment_reactions").select("moment_id, by_role").eq("family_id", family.id);
  const lovedBy = (id: string) =>
    (loves ?? []).filter((l) => l.moment_id === id).map((l) => (l.by_role === "nanny" ? ("nanny" as const) : ("family" as const)));

  const moments: MomentRow[] = await Promise.all(
    (rows ?? []).map(async (row) => {
      let photoUrl: string | null = null;
      if (row.kind === "photo" && row.storage_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("family-docs")
          .createSignedUrl(row.storage_path, 300);
        photoUrl = signed?.signedUrl ?? null;
      }
      return {
        id: row.id,
        kind: row.kind,
        momentDate: row.moment_date,
        caption: row.caption,
        milestoneLabel: row.milestone_label,
        childId: row.child_id,
        childName: (children ?? []).find((c) => c.id === row.child_id)?.name ?? null,
        photoUrl,
        addedBy: row.added_by,
        addedByName: row.added_by_name,
        createdAt: row.created_at,
        lovedBy: lovedBy(row.id),
      };
    }),
  );

  return {
    access: family.access,
    familyName: family.family_name,
    children: (children ?? []).map((c) => ({ id: c.id, name: c.name })),
    moments,
  };
}

function clean(value: string | undefined | null, max: number) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

async function resolveChildId(familyId: string, childId: string | undefined) {
  if (!childId) return null;
  const { data } = await supabaseAdmin
    .from("family_children")
    .select("id")
    .eq("id", childId)
    .eq("family_id", familyId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function addMoment(slug: string, input: MomentInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");

  const childId = await resolveChildId(family.id, input.childId);
  const { error } = await supabaseAdmin.from("family_moments").insert({
    family_id: family.id,
    kind: input.kind,
    moment_date: input.momentDate,
    caption: clean(input.caption, 500),
    milestone_label: clean(input.milestoneLabel, 200),
    child_id: childId,
    added_by: family.access,
  });
  if (error) throw new Error(error.message);
  await (await import("./notifications.server")).notifyOther(family, "moments", "New photo moment");
}

export async function saveMomentPhoto(slug: string, input: MomentPhotoInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");

  const bytes = Buffer.from(input.base64, "base64");
  if (bytes.length === 0) throw new Error("Choose a photo to add.");
  if (bytes.length > 8 * 1024 * 1024) throw new Error("Photo must be under 8MB");

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `moments/${family.id}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("family-docs")
    .upload(path, bytes, { contentType: input.contentType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const childId = await resolveChildId(family.id, input.childId);
  const { error } = await supabaseAdmin.from("family_moments").insert({
    family_id: family.id,
    kind: "photo",
    moment_date: input.momentDate,
    caption: clean(input.caption, 500),
    milestone_label: clean(input.milestoneLabel, 200),
    child_id: childId,
    storage_path: path,
    added_by: family.access,
  });
  if (error) {
    await supabaseAdmin.storage.from("family-docs").remove([path]);
    throw new Error(error.message);
  }
}

/** Loves or un-loves a moment for whoever is signed in. */
export async function toggleMomentLove(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const { data: moment } = await supabaseAdmin.from("family_moments").select("id").eq("id", id).eq("family_id", family.id).maybeSingle();
  if (!moment) throw new Error("That moment could not be found.");
  const mine = { moment_id: id, family_id: family.id, by_role: family.access };
  const { data: existing } = await supabaseAdmin.from("moment_reactions").select("moment_id").match({ moment_id: id, by_role: family.access }).maybeSingle();
  if (existing) {
    await supabaseAdmin.from("moment_reactions").delete().match({ moment_id: id, by_role: family.access });
    return { loved: false as const };
  }
  const { error } = await supabaseAdmin.from("moment_reactions").insert(mine);
  if (error) throw new Error("Couldn't save that.");
  await (await import("./notifications.server")).notifyOther(family, "moments", family.access === "family" ? "A parent loved your photo" : "Your nanny loved a photo");
  return { loved: true as const };
}

export async function deleteMoment(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");

  const { data: row } = await supabaseAdmin
    .from("family_moments")
    .select("storage_path, added_by")
    .eq("id", id)
    .eq("family_id", family.id)
    .maybeSingle();
  if (!row) throw new Error("That moment could not be found.");
  if (family.access !== "family" && row.added_by !== family.access) {
    throw new Error("You can only remove moments you added.");
  }

  const { error } = await supabaseAdmin
    .from("family_moments")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
  if (row.storage_path) {
    await supabaseAdmin.storage.from("family-docs").remove([row.storage_path]);
  }
}
