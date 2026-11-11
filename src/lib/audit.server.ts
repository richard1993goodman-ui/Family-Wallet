import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuditEvent = {
  actorKind: "owner" | "agency_staff" | "parent" | "nanny" | "system" | "webhook";
  actorId?: string | null;
  action: string;
  familyId?: string | null;
  agencyId?: string | null;
  reason?: string;
  /** Facts about the event. Never put codes, tokens or document contents here. */
  meta?: Record<string, string | number | boolean | null>;
};

/**
 * Records a sensitive action. A failure to log must never block the user's action, but it is reported
 * loudly so a missing table (migration not applied yet) is noticed.
 */
export async function audit(event: AuditEvent) {
  const { error } = await supabaseAdmin.from("audit_log").insert({
    actor_kind: event.actorKind,
    actor_id: event.actorId ?? null,
    action: event.action,
    family_id: event.familyId ?? null,
    agency_id: event.agencyId ?? null,
    reason: event.reason ?? null,
    meta: event.meta ?? {},
  });
  if (error) console.error("audit_log write failed:", error.message);
}
