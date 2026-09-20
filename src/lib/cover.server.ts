import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import type { CoverInput, CoverStatus, CoverType } from "./cover.types";
import { COVER_TYPES } from "./cover.types";

function clean(value: string | undefined | null, max = 500) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function label(type: CoverType) {
  return COVER_TYPES.find((t) => t.value === type)?.label ?? "Cover";
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export async function loadCover(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;

  const [{ data: requests }, { data: children }] = await Promise.all([
    supabaseAdmin
      .from("cover_requests")
      .select(
        "id, cover_type, start_date, end_date, start_time, end_time, children, location, notes, status, requested_by, created_at",
      )
      .eq("family_id", family.id)
      .order("created_at", { ascending: false })
      .limit(25),
    supabaseAdmin
      .from("family_children")
      .select("name")
      .eq("family_id", family.id)
      .order("sort_order"),
  ]);

  return {
    access: family.access,
    familyName: family.family_name,
    childNames: (children ?? []).map((c) => c.name),
    requests: (requests ?? []).map((r) => ({
      id: r.id,
      coverType: r.cover_type as CoverType,
      startDate: r.start_date,
      endDate: r.end_date,
      startTime: r.start_time,
      endTime: r.end_time,
      children: r.children,
      location: r.location,
      notes: r.notes,
      status: r.status as CoverStatus,
      requestedBy: r.requested_by,
      createdAt: r.created_at,
    })),
  };
}

export async function requestCover(slug: string, input: CoverInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  if (!input.startDate) throw new Error("Please choose the date you need cover.");

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("cover_requests")
    .select("id", { count: "exact", head: true })
    .eq("family_id", family.id)
    .gte("created_at", since);
  if ((count ?? 0) >= 6) throw new Error("Please wait a little before sending another request.");

  const times =
    input.startTime && input.endTime
      ? `${input.startTime} – ${input.endTime}`
      : input.startTime || input.endTime || "Times to confirm";
  const dates =
    input.endDate && input.endDate !== input.startDate
      ? `${formatDate(input.startDate)} – ${formatDate(input.endDate)}`
      : formatDate(input.startDate);

  const body = [
    `${label(input.coverType)} requested`,
    `Dates: ${dates}`,
    `Hours: ${times}`,
    input.children ? `Children: ${clean(input.children, 200)}` : null,
    input.location ? `Where: ${clean(input.location, 200)}` : null,
    input.notes ? `Notes: ${clean(input.notes, 1000)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Land the request in the agency inbox so it is answered like any other message.
  const { data: thread, error: threadError } = await supabaseAdmin
    .from("support_threads")
    .insert({
      family_id: family.id,
      subject: `${label(input.coverType)} — ${dates}`,
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

  const { error } = await supabaseAdmin.from("cover_requests").insert({
    family_id: family.id,
    cover_type: input.coverType,
    start_date: input.startDate,
    end_date: input.endDate || null,
    start_time: clean(input.startTime, 20),
    end_time: clean(input.endTime, 20),
    children: clean(input.children, 200),
    location: clean(input.location, 200),
    notes: clean(input.notes, 1000),
    requested_by: family.access,
    thread_id: thread.id,
  });
  if (error) throw new Error(error.message);

  return { threadId: thread.id };
}

export async function cancelCover(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const { error } = await supabaseAdmin
    .from("cover_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}
