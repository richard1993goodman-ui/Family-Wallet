import { setResponseHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { canEditPlaybook, playbookEntrySchema, type PlaybookData, type PlaybookInput, type PlaybookRow } from "./kids-playbook.types";

const TABLE = "kids_playbook_entries";

async function family(slug: string) {
  setResponseHeader("Cache-Control", "no-store");
  const f = await requireSharedFamily(slug);
  if (!f) throw new Error("Please unlock your wallet.");
  return f;
}

export async function loadKidsPlaybook(slug: string): Promise<PlaybookData | null> {
  setResponseHeader("Cache-Control", "no-store");
  const f = await requireSharedFamily(slug);
  if (!f) return null;
  const { data, error } = await supabaseAdmin.from(TABLE)
    .select("id, category, child_name, title, notes, added_by, updated_at").eq("family_id", f.id).order("child_name").order("title");
  if (error) throw new Error("Couldn't load the kids' playbook.");
  const entries: PlaybookRow[] = (data ?? []).map(r => ({ id: r.id, category: r.category as PlaybookRow["category"], childName: r.child_name, title: r.title, notes: r.notes, addedBy: r.added_by as PlaybookRow["addedBy"], updatedAt: r.updated_at }));
  return { access: f.access, entries };
}

export async function saveKidsPlaybook(slug: string, input: PlaybookInput) {
  const f = await family(slug);
  const entry = playbookEntrySchema.parse(input);
  if (!canEditPlaybook(f.access, entry.category)) throw new Error("Only parents or guardians can change this section.");
  const values = { category: entry.category, child_name: entry.childName, title: entry.title, notes: entry.notes, updated_at: new Date().toISOString() };
  if (entry.id) {
    const { data: existing } = await supabaseAdmin.from(TABLE).select("category").eq("id", entry.id).eq("family_id", f.id).maybeSingle();
    if (!existing || !canEditPlaybook(f.access, existing.category)) throw new Error("Only parents or guardians can change this section.");
    const { error } = await supabaseAdmin.from(TABLE).update(values).eq("id", entry.id).eq("family_id", f.id);
    if (error) throw new Error("Couldn't save that.");
  } else {
    const { error } = await supabaseAdmin.from(TABLE).insert({ ...values, family_id: f.id, added_by: f.access });
    if (error) throw new Error("Couldn't save that.");
  }
  return { ok: true as const };
}

export async function deleteKidsPlaybook(slug: string, id: string) {
  const f = await family(slug);
  const { data: existing } = await supabaseAdmin.from(TABLE).select("category").eq("id", id).eq("family_id", f.id).maybeSingle();
  if (!existing || !canEditPlaybook(f.access, existing.category)) throw new Error("Only parents or guardians can change this section.");
  const { error } = await supabaseAdmin.from(TABLE).delete().eq("id", id).eq("family_id", f.id);
  if (error) throw new Error("Couldn't remove that.");
  return { ok: true as const };
}
