import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import type { CheckinInput, CheckinKind } from "./checkin.types";
import { CHECKIN_KINDS, CHECKIN_PROMPTS } from "./checkin.types";

function kindLabel(kind: CheckinKind) {
  return CHECKIN_KINDS.find((k) => k.value === kind)?.label ?? "Check-in";
}

function cleanAnswers(answers: Record<string, string>) {
  const allowed = new Set(CHECKIN_PROMPTS.map((p) => p.key));
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers ?? {})) {
    if (!allowed.has(key)) continue;
    const trimmed = (value ?? "").trim();
    if (trimmed) out[key] = trimmed.slice(0, 1500);
  }
  return out;
}

export async function loadCheckins(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;

  const [{ data: rows }, { data: nannies }] = await Promise.all([
    supabaseAdmin
      .from("review_checkins")
      .select(
        "id, kind, status, answers, author, nanny_id, call_requested, completed_at, created_at, updated_at",
      )
      .eq("family_id", family.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("family_nannies")
      .select("id, name")
      .eq("family_id", family.id)
      .eq("status", "active")
      .order("sort_order"),
  ]);

  const startDate = family.start_date ? new Date(`${family.start_date}T00:00:00Z`) : null;
  const monthsSinceStart = startDate
    ? Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : null;

  return {
    access: family.access,
    familyName: family.family_name,
    startDate: family.start_date,
    monthsSinceStart,
    nannies: (nannies ?? []).map((n) => ({ id: n.id, name: n.name })),
    checkins: (rows ?? []).map((r) => ({
      id: r.id,
      kind: r.kind as CheckinKind,
      status: r.status,
      answers: (r.answers ?? {}) as Record<string, string>,
      author: r.author,
      nannyId: r.nanny_id,
      callRequested: r.call_requested,
      completedAt: r.completed_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  };
}

export async function saveCheckin(slug: string, input: CheckinInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");

  const answers = cleanAnswers(input.answers);
  const now = new Date().toISOString();
  const payload = {
    family_id: family.id,
    kind: input.kind,
    nanny_id: input.nannyId || null,
    answers,
    author: family.access,
    status: input.complete ? "complete" : "draft",
    completed_at: input.complete ? now : null,
    updated_at: now,
  };

  if (input.id) {
    const { error } = await supabaseAdmin
      .from("review_checkins")
      .update(payload)
      .eq("id", input.id)
      .eq("family_id", family.id);
    if (error) throw new Error(error.message);
    return { id: input.id };
  }

  const { data, error } = await supabaseAdmin
    .from("review_checkins")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function deleteCheckin(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const { error } = await supabaseAdmin
    .from("review_checkins")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

export async function requestReviewCall(
  slug: string,
  input: { checkinId?: string | undefined; kind: CheckinKind; notes?: string | undefined },
) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("support_threads")
    .select("id", { count: "exact", head: true })
    .eq("family_id", family.id)
    .gte("created_at", since);
  if ((count ?? 0) >= 6) throw new Error("Please wait a little before sending another request.");

  const who = family.access === "nanny" ? "the nanny" : "the family";
  const body = [
    `${kindLabel(input.kind)} — call requested by ${who}.`,
    input.notes ? `Notes: ${input.notes.trim().slice(0, 1000)}` : null,
    "Please arrange a neutral check-in call.",
  ]
    .filter(Boolean)
    .join("\n");

  const { data: thread, error: threadError } = await supabaseAdmin
    .from("support_threads")
    .insert({
      family_id: family.id,
      subject: `${kindLabel(input.kind)} call request`,
      last_sender: family.access,
      family_unread: false,
      nanny_unread: false,
    })
    .select("id")
    .single();
  if (threadError) throw new Error(threadError.message);

  await supabaseAdmin
    .from("support_messages")
    .insert({ thread_id: thread.id, sender: family.access, body });

  if (input.checkinId) {
    await supabaseAdmin
      .from("review_checkins")
      .update({ call_requested: true, thread_id: thread.id, updated_at: new Date().toISOString() })
      .eq("id", input.checkinId)
      .eq("family_id", family.id);
  } else {
    await supabaseAdmin.from("review_checkins").insert({
      family_id: family.id,
      kind: input.kind,
      author: family.access,
      call_requested: true,
      thread_id: thread.id,
      answers: {},
    });
  }

  return { threadId: thread.id };
}
