import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { INCIDENT_KINDS, INCIDENT_SEVERITIES, type IncidentInput } from "./incidents.types";

function clean(value: string | undefined | null, max: number) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function loadIncidents(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;

  const [{ data: incidents }, { data: children }] = await Promise.all([
    supabaseAdmin
      .from("incident_reports")
      .select(
        "id, child_name, occurred_at, kind, severity, what_happened, action_taken, parents_told, reported_by, reported_by_name, acknowledged_at, acknowledged_by_name",
      )
      .eq("family_id", family.id)
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("family_children")
      .select("name")
      .eq("family_id", family.id)
      .order("sort_order"),
  ]);

  return {
    access: family.access,
    familyName: family.family_name,
    children: (children ?? []).map((c) => c.name),
    incidents: (incidents ?? []).map((i) => ({
      id: i.id,
      childName: i.child_name,
      occurredAt: i.occurred_at,
      kind: i.kind,
      severity: i.severity,
      whatHappened: i.what_happened,
      actionTaken: i.action_taken,
      parentsTold: i.parents_told,
      reportedBy: i.reported_by,
      reportedByName: i.reported_by_name,
      acknowledgedAt: i.acknowledged_at,
      acknowledgedByName: i.acknowledged_by_name,
    })),
  };
}

export async function addIncident(slug: string, input: IncidentInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const childName = clean(input.childName, 120);
  if (!childName) throw new Error("Please choose which child this was about.");
  const what = clean(input.whatHappened, 2000);
  if (!what) throw new Error("Please describe what happened.");
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) throw new Error("Please check the time it happened.");
  if (!INCIDENT_KINDS.some((k) => k.value === input.kind)) throw new Error("Please choose a type.");
  if (!INCIDENT_SEVERITIES.some((s) => s.value === input.severity)) {
    throw new Error("Please say how serious it was.");
  }

  const reporterName = family.access === "nanny" ? family.nanny_name : family.family_name;
  const { error } = await supabaseAdmin.from("incident_reports").insert({
    family_id: family.id,
    child_name: childName,
    occurred_at: occurredAt.toISOString(),
    kind: input.kind,
    severity: input.severity,
    what_happened: what,
    action_taken: clean(input.actionTaken, 2000) ?? "",
    parents_told: Boolean(input.parentsTold),
    reported_by: family.access,
    reported_by_name: reporterName,
    // A parent logging their own report has nothing further to sign off.
    ...(family.access === "family"
      ? { acknowledged_at: new Date().toISOString(), acknowledged_by_name: reporterName }
      : {}),
  });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function acknowledgeIncident(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  if (family.access !== "family") throw new Error("Only a parent can sign off a report.");
  const { error } = await supabaseAdmin
    .from("incident_reports")
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by_name: family.family_name })
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

export async function deleteIncident(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  if (family.access !== "family") throw new Error("Only a parent can remove a report.");
  const { error } = await supabaseAdmin
    .from("incident_reports")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}
