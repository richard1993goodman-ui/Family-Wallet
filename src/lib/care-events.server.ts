import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { CARE_KINDS, type CareEventInput, type CareEventRow, type CareEventsData, type CareKind } from "./care-events.types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function loadCareEvents(slug: string): Promise<CareEventsData | null> {
  const family = await requireSharedFamily(slug);
  if (!family) return null;

  const since = new Date(Date.now() - WEEK_MS).toISOString();
  const [{ data: children }, { data: rows }] = await Promise.all([
    supabaseAdmin.from("family_children").select("id, name").eq("family_id", family.id).order("sort_order"),
    supabaseAdmin
      .from("care_events")
      .select("id, kind, child_id, started_at, ended_at, amount_ml, detail, added_by")
      .eq("family_id", family.id)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(500),
  ]);

  const events: CareEventRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    kind: r.kind as CareKind,
    childId: r.child_id,
    childName: (children ?? []).find((c) => c.id === r.child_id)?.name ?? null,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    amountMl: r.amount_ml,
    detail: r.detail,
    addedBy: r.added_by,
  }));
  return { access: family.access, children: (children ?? []).map((c) => ({ id: c.id, name: c.name })), events };
}

export async function addCareEvent(slug: string, input: CareEventInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  if (!CARE_KINDS.includes(input.kind)) throw new Error("Unknown entry type.");

  let childId: string | null = null;
  if (input.childId) {
    const { data } = await supabaseAdmin
      .from("family_children").select("id").eq("id", input.childId).eq("family_id", family.id).maybeSingle();
    childId = data?.id ?? null;
  }
  const ml = input.kind === "bottle" ? Math.round(Number(input.amountMl)) : null;
  if (input.kind === "bottle" && !(ml! > 0 && ml! <= 1000)) throw new Error("Enter the bottle size in ml (1 to 1000).");

  const { error } = await supabaseAdmin.from("care_events").insert({
    family_id: family.id,
    child_id: childId,
    kind: input.kind,
    amount_ml: ml,
    detail: input.detail?.trim().slice(0, 200) || null,
    added_by: family.access,
  });
  if (error) throw new Error(error.message);
  await (await import("./notifications.server")).notifyOther(family, "today", "New entry in Today");
}

export async function endNap(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const { error } = await supabaseAdmin
    .from("care_events")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", id).eq("family_id", family.id).eq("kind", "nap").is("ended_at", null);
  if (error) throw new Error(error.message);
}

export async function deleteCareEvent(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const { data: row } = await supabaseAdmin
    .from("care_events").select("added_by").eq("id", id).eq("family_id", family.id).maybeSingle();
  if (!row) throw new Error("That entry could not be found.");
  if (family.access !== "family" && row.added_by !== family.access) throw new Error("You can only remove entries you added.");
  const { error } = await supabaseAdmin.from("care_events").delete().eq("id", id).eq("family_id", family.id);
  if (error) throw new Error(error.message);
}
