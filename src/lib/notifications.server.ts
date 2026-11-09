import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { countUnseen, isPushFeature, PUSH_FEATURES } from "./push";
import { pushPublicKey, pushToOtherSide } from "./push.server";

type Actor = "family" | "nanny";
const FEATURE = /^[a-z]{2,20}$/;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Records that this person changed something so the other side gets a badge (and a push for key features).
 * Never throws: a notification problem must not fail the save that triggered it.
 */
export async function notifyOther(family: { id: string; access: Actor }, feature: string, summary: string) {
  try {
    await supabaseAdmin.from("wallet_activity").insert({ family_id: family.id, feature, actor: family.access, summary });
    await pushToOtherSide(family.id, family.access, feature);
  } catch (error) {
    console.error("notifyOther failed", feature, error);
  }
}

/** Unread counts per feature (route prefix) for whoever is signed in. */
export async function loadBadges(slug: string): Promise<Record<string, number>> {
  const family = await requireSharedFamily(slug);
  if (!family) return {};
  const since = new Date(Date.now() - 14 * DAY).toISOString();
  const [{ data: activity }, { data: seen }] = await Promise.all([
    supabaseAdmin
      .from("wallet_activity")
      .select("feature, actor, created_at")
      .eq("family_id", family.id)
      .neq("actor", family.access)
      .gt("created_at", since)
      .limit(500),
    supabaseAdmin.from("wallet_seen").select("feature, seen_at").eq("family_id", family.id).eq("role", family.access),
  ]);
  return countUnseen(family.access, activity ?? [], seen ?? []);
}

export type InboxItem = { id: string; feature: string; summary: string; createdAt: string };

/** Unread notifications for the bell: what the other person did since you last opened or ticked that page. */
export async function loadInbox(slug: string): Promise<InboxItem[]> {
  const family = await requireSharedFamily(slug);
  if (!family) return [];
  const since = new Date(Date.now() - 14 * DAY).toISOString();
  const [{ data: activity }, { data: seen }] = await Promise.all([
    supabaseAdmin
      .from("wallet_activity")
      .select("id, feature, summary, created_at")
      .eq("family_id", family.id)
      .neq("actor", family.access)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin.from("wallet_seen").select("feature, seen_at").eq("family_id", family.id).eq("role", family.access),
  ]);
  const seenAt = new Map((seen ?? []).map((s) => [s.feature, new Date(s.seen_at).getTime()]));
  return (activity ?? [])
    .filter((a) => new Date(a.created_at).getTime() > (seenAt.get(a.feature) ?? 0))
    .slice(0, 30)
    .map((a) => ({ id: String(a.id), feature: a.feature, summary: a.summary, createdAt: a.created_at }));
}

export async function markSeen(slug: string, feature: string) {
  const family = await requireSharedFamily(slug);
  if (!family || !FEATURE.test(feature)) return;
  await supabaseAdmin
    .from("wallet_seen")
    .upsert({ family_id: family.id, role: family.access, feature, seen_at: new Date().toISOString() }, { onConflict: "family_id,role,feature" });
}

/* ---------------- Push subscriptions ---------------- */

export type PushPrefs = { subscribed: boolean; muted: string[]; quietStart: number | null; quietEnd: number | null };

export function pushConfig() {
  return { publicKey: pushPublicKey(), features: PUSH_FEATURES };
}

const validEndpoint = (endpoint: string) => /^https:\/\/[^\s]{10,1000}$/.test(endpoint);

export async function savePushSubscription(slug: string, endpoint: string, tz: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  if (!validEndpoint(endpoint)) throw new Error("That device can't receive notifications.");
  const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
    {
      family_id: family.id,
      slug,
      role: family.access,
      endpoint,
      tz: /^[A-Za-z_]+\/[A-Za-z_\-/]+$/.test(tz) ? tz : "Europe/London",
      last_delivered_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error("Couldn't turn notifications on.");
}

export async function removePushSubscription(slug: string, endpoint: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return;
  await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("family_id", family.id);
}

export async function loadPushPrefs(slug: string, endpoint: string): Promise<PushPrefs> {
  const family = await requireSharedFamily(slug);
  const none = { subscribed: false, muted: [], quietStart: null, quietEnd: null };
  if (!family || !validEndpoint(endpoint)) return none;
  const { data } = await supabaseAdmin
    .from("push_subscriptions")
    .select("muted_features, quiet_start, quiet_end")
    .eq("endpoint", endpoint)
    .eq("family_id", family.id)
    .maybeSingle();
  return data ? { subscribed: true, muted: data.muted_features ?? [], quietStart: data.quiet_start, quietEnd: data.quiet_end } : none;
}

export async function savePushPrefs(
  slug: string,
  endpoint: string,
  prefs: { muted: string[]; quietStart: number | null; quietEnd: number | null },
) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const hour = (v: number | null) => (v === null || !Number.isInteger(v) || v < 0 || v > 23 ? null : v);
  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .update({
      muted_features: prefs.muted.filter(isPushFeature),
      quiet_start: hour(prefs.quietStart),
      quiet_end: hour(prefs.quietEnd),
    })
    .eq("endpoint", endpoint)
    .eq("family_id", family.id);
  if (error) throw new Error("Couldn't save that.");
}

/**
 * Called by the service worker after an empty push. The endpoint is a secret only this device and the push
 * service know, so it stands in for a login. Returns generic text if nothing new, since Safari needs every push shown.
 */
export async function latestForEndpoint(endpoint: string) {
  const fallback = { title: "The Family Wallet", body: "Open the wallet to see what's new.", url: "/" };
  if (!validEndpoint(endpoint)) return fallback;
  const { data: sub } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, family_id, slug, role, muted_features, last_delivered_at, quiet_start, quiet_end, tz")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (!sub) return fallback;
  const { data: rows } = await supabaseAdmin
    .from("wallet_activity")
    .select("feature, summary, created_at")
    .eq("family_id", sub.family_id)
    .neq("actor", sub.role)
    .gt("created_at", sub.last_delivered_at)
    .order("created_at", { ascending: false })
    .limit(20);
  const items = (rows ?? []).filter((r) => isPushFeature(r.feature) && !(sub.muted_features ?? []).includes(r.feature));
  if (!items.length) return { ...fallback, url: `/w/${sub.slug}` };
  await supabaseAdmin.from("push_subscriptions").update({ last_delivered_at: new Date().toISOString() }).eq("id", sub.id);
  const first = items[0]!;
  return {
    title: "The Family Wallet",
    body: items.length === 1 ? first.summary : `${items.length} new updates`,
    url: items.length === 1 ? `/${first.feature}/${sub.slug}` : `/w/${sub.slug}`,
  };
}
