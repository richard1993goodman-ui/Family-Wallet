import { assertTwoStep } from "./staff.scope";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string };
type Section = { heading: string; body: string };

async function assertAdmin(context: Ctx) {
  assertTwoStep(context);
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

const text = (value: string | undefined | null, max: number) => {
  const clean = (value ?? "").trim();
  return clean ? clean.slice(0, max) : null;
};

export const getPerks = createServerFn({ method: "GET" }).inputValidator((d: { slug: string }) => d).handler(async ({ data }) => {
  const { loadPartnerPerks } = await import("./premium-content.server");
  return loadPartnerPerks(data.slug);
});

export const getPlaybooks = createServerFn({ method: "GET" }).inputValidator((d: { slug: string }) => d).handler(async ({ data }) => {
  const { loadPlaybooks } = await import("./premium-content.server");
  return loadPlaybooks(data.slug);
});

export const markPlaybookRead = createServerFn({ method: "POST" }).inputValidator((d: { slug: string; playbookId: string }) => d).handler(async ({ data }) => {
  const { recordPlaybookRead } = await import("./premium-content.server");
  await recordPlaybookRead(data.slug, data.playbookId);
  return { ok: true as const };
});

export const listPremiumContentAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context as unknown as Ctx);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: perks, error: perkError }, { data: playbooks, error: playbookError }, { data: recipients }] = await Promise.all([
    supabaseAdmin.from("partner_perks").select("*").order("sort_order").order("created_at", { ascending: false }),
    supabaseAdmin.from("seasonal_playbooks").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("playbook_recipients").select("playbook_id, family_id"),
  ]);
  if (perkError) throw new Error(perkError.message);
  if (playbookError) throw new Error(playbookError.message);
  return {
    perks: perks ?? [],
    playbooks: (playbooks ?? []).map((p) => ({ ...p, recipientIds: (recipients ?? []).filter((r) => r.playbook_id === p.id).map((r) => r.family_id) })),
  };
});

export type PerkInput = { id?: string; title: string; partnerName: string; category: string; area?: string; offerText: string; description?: string; redemptionInstructions?: string; offerCode?: string; websiteUrl?: string; contactText?: string; expiresOn?: string; isPublished: boolean };
export const savePerk = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: PerkInput) => d).handler(async ({ data, context }) => {
  await assertAdmin(context as unknown as Ctx);
  if (!text(data.title, 140) || !text(data.partnerName, 140) || !text(data.offerText, 500)) throw new Error("Add the partner, title and member offer");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const row = { title: text(data.title, 140) ?? "", partner_name: text(data.partnerName, 140) ?? "", category: text(data.category, 80) ?? "Family services", area: text(data.area, 120), offer_text: text(data.offerText, 500) ?? "", description: text(data.description, 2000), redemption_instructions: text(data.redemptionInstructions, 1000), offer_code: text(data.offerCode, 100), website_url: text(data.websiteUrl, 500), contact_text: text(data.contactText, 300), expires_on: data.expiresOn || null, is_published: data.isPublished, updated_at: new Date().toISOString() };
  const result = data.id ? await supabaseAdmin.from("partner_perks").update(row).eq("id", data.id) : await supabaseAdmin.from("partner_perks").insert(row);
  if (result.error) throw new Error(result.error.message);
  return { ok: true as const };
});

export type PlaybookInput = { id?: string; title: string; season: string; topic: string; introduction?: string; ageGuidance?: string; sections: Section[]; coverImageUrl?: string; resourceUrl?: string; audience: "all" | "selected"; familyIds: string[]; isFeatured: boolean; isPublished: boolean };
export const savePlaybook = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: PlaybookInput) => d).handler(async ({ data, context }) => {
  await assertAdmin(context as unknown as Ctx);
  if (!text(data.title, 160) || !text(data.season, 60) || !text(data.topic, 80)) throw new Error("Add a title, season and topic");
  if (data.audience === "selected" && data.familyIds.length === 0) throw new Error("Choose at least one family");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const row = { title: text(data.title, 160) ?? "", season: text(data.season, 60) ?? "", topic: text(data.topic, 80) ?? "", introduction: text(data.introduction, 2000), age_guidance: text(data.ageGuidance, 300), sections: data.sections.filter((s) => s.heading.trim() && s.body.trim()).slice(0, 12).map((s) => ({ heading: s.heading.trim().slice(0, 140), body: s.body.trim().slice(0, 5000) })), cover_image_url: text(data.coverImageUrl, 500), resource_url: text(data.resourceUrl, 500), audience: data.audience, is_featured: data.isFeatured, is_published: data.isPublished, published_at: data.isPublished ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
  let id = data.id;
  if (id) {
    const { error } = await supabaseAdmin.from("seasonal_playbooks").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data: created, error } = await supabaseAdmin.from("seasonal_playbooks").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    id = created.id;
  }
  await supabaseAdmin.from("playbook_recipients").delete().eq("playbook_id", id);
  if (data.audience === "selected") {
    const { error } = await supabaseAdmin.from("playbook_recipients").insert(data.familyIds.map((family_id) => ({ playbook_id: id, family_id })));
    if (error) throw new Error(error.message);
  }
  return { id };
});

export const deletePremiumContent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: { kind: "perk" | "playbook"; id: string }) => d).handler(async ({ data, context }) => {
  await assertAdmin(context as unknown as Ctx);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = data.kind === "perk" ? await supabaseAdmin.from("partner_perks").delete().eq("id", data.id) : await supabaseAdmin.from("seasonal_playbooks").delete().eq("id", data.id);
  if (result.error) throw new Error(result.error.message);
  return { ok: true as const };
});