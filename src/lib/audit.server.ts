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

/**
 * The owner opening or changing a family's records. Only the owner can reach family data (partner staff are
 * refused upstream), so the actor is always the owner; the signed-in user id says which person.
 */
export async function auditOwner(
  context: unknown,
  action: string,
  familyId: string | null,
  meta?: AuditEvent["meta"],
) {
  const userId = (context as { userId?: string } | null)?.userId ?? null;
  await audit({ actorKind: "owner", actorId: userId, action, familyId, ...(meta ? { meta } : {}) });
}
