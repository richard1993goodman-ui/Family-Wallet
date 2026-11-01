import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { MESSAGE_TOPICS, type HouseholdMessagesData } from "./messages.types";

const topicIds = new Set<string>(MESSAGE_TOPICS.map((t) => t.id));
const senderName = (f: { access: string; nanny_name: string | null }) =>
  f.access === "family" ? "Parent" : f.nanny_name ?? "Nanny";

export async function loadMessages(slug: string): Promise<HouseholdMessagesData | null> {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const { data: threads } = await supabaseAdmin
    .from("household_threads")
    .select("id, topic, title, last_sender, family_unread, nanny_unread, updated_at")
    .eq("family_id", family.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  const ids = (threads ?? []).map((t) => t.id);
  const { data: msgs } = ids.length
    ? await supabaseAdmin
        .from("household_messages")
        .select("id, thread_id, sender, sender_name, body, created_at")
        .in("thread_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] };
  return {
    access: family.access,
    threads: (threads ?? []).map((t) => ({
      id: t.id,
      topic: t.topic,
      title: t.title,
      lastSender: t.last_sender,
      unread: family.access === "family" ? t.family_unread : t.nanny_unread,
      updatedAt: t.updated_at,
      messages: (msgs ?? [])
        .filter((m) => m.thread_id === t.id)
        .map((m) => ({ id: m.id, sender: m.sender, senderName: m.sender_name, body: m.body, createdAt: m.created_at })),
    })),
  };
}

function cleanBody(body: string) {
  const b = (body ?? "").trim().slice(0, 4000);
  if (!b) throw new Error("Write a message first.");
  return b;
}

export async function startThread(slug: string, input: { topic: string; title: string; body: string }) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const title = (input.title ?? "").trim().slice(0, 120);
  if (!title) throw new Error("Give the conversation a subject.");
  const body = cleanBody(input.body);
  const { data, error } = await supabaseAdmin
    .from("household_threads")
    .insert({
      family_id: family.id,
      topic: topicIds.has(input.topic) ? input.topic : "general",
      title,
      created_by: family.access,
      last_sender: family.access,
      family_unread: family.access === "nanny",
      nanny_unread: family.access === "family",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("Couldn't start that conversation.");
  await supabaseAdmin.from("household_messages").insert({ thread_id: data.id, sender: family.access, sender_name: senderName(family), body });
  return data.id;
}

async function ownThread(familyId: string, threadId: string) {
  const { data } = await supabaseAdmin.from("household_threads").select("id").eq("id", threadId).eq("family_id", familyId).maybeSingle();
  if (!data) throw new Error("Conversation not found.");
}

export async function replyThread(slug: string, threadId: string, body: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  await ownThread(family.id, threadId);
  const text = cleanBody(body);
  const { error } = await supabaseAdmin.from("household_messages").insert({ thread_id: threadId, sender: family.access, sender_name: senderName(family), body: text });
  if (error) throw new Error("Couldn't send that message.");
  await supabaseAdmin
    .from("household_threads")
    .update({
      last_sender: family.access,
      updated_at: new Date().toISOString(),
      ...(family.access === "family" ? { nanny_unread: true, family_unread: false } : { family_unread: true, nanny_unread: false }),
    })
    .eq("id", threadId);
}

export async function markThreadRead(slug: string, threadId: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return;
  await supabaseAdmin
    .from("household_threads")
    .update(family.access === "family" ? { family_unread: false } : { nanny_unread: false })
    .eq("id", threadId)
    .eq("family_id", family.id);
}
