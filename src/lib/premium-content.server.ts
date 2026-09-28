import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";

export type PlaybookSection = { heading: string; body: string };

function sections(value: unknown): PlaybookSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return typeof row.heading === "string" && typeof row.body === "string"
      ? [{ heading: row.heading, body: row.body }]
      : [];
  });
}

export async function loadPartnerPerks(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const { data, error } = await supabaseAdmin
    .from("partner_perks")
    .select("id, title, partner_name, category, area, offer_text, description, redemption_instructions, offer_code, website_url, contact_text, expires_on")
    .eq("is_published", true)
    .or(`expires_on.is.null,expires_on.gte.${new Date().toISOString().slice(0, 10)}`)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return {
    access: family.access,
    perks: (data ?? []).map((perk) => ({
      ...perk,
      offer_code: family.access === "family" ? perk.offer_code : null,
      redemption_instructions: family.access === "family" ? perk.redemption_instructions : null,
    })),
  };
}

export async function loadPlaybooks(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const { data: recipientRows } = await supabaseAdmin
    .from("playbook_recipients")
    .select("playbook_id")
    .eq("family_id", family.id);
  const selectedIds = (recipientRows ?? []).map((row) => row.playbook_id);
  let query = supabaseAdmin
    .from("seasonal_playbooks")
    .select("id, title, season, topic, introduction, age_guidance, sections, cover_image_url, resource_url, audience, is_featured, published_at")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false });
  if (selectedIds.length) query = query.or(`audience.eq.all,id.in.(${selectedIds.join(",")})`);
  else query = query.eq("audience", "all");
  const [{ data, error }, { data: reads }] = await Promise.all([
    query,
    supabaseAdmin.from("playbook_reads").select("playbook_id, reader_role, read_at").eq("family_id", family.id).eq("reader_role", family.access),
  ]);
  if (error) throw new Error(error.message);
  const readMap = new Map((reads ?? []).map((row) => [row.playbook_id, row.read_at]));
  return {
    access: family.access,
    playbooks: (data ?? []).map((playbook) => ({ ...playbook, sections: sections(playbook.sections), readAt: readMap.get(playbook.id) ?? null })),
  };
}

export async function recordPlaybookRead(slug: string, playbookId: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Locked");
  const { error } = await supabaseAdmin.from("playbook_reads").upsert(
    { playbook_id: playbookId, family_id: family.id, reader_role: family.access, read_at: new Date().toISOString() },
    { onConflict: "playbook_id,family_id,reader_role" },
  );
  if (error) throw new Error(error.message);
}