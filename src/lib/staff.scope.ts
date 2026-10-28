// Agency staff scope: the AthleteMannies owner (admin role) sees every family;
// partner-agency staff see only families whose partner_agency_id matches theirs.
export type StaffScope =
  | { kind: "owner" }
  | { kind: "partner"; agencyId: string; agencyName: string };

type StaffCtx = {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown }> };
  userId: string;
  claims?: { email?: string; aal?: string } | null;
};

/** Agency access needs a session verified with an authenticator-app code. */
export function assertTwoStep(context: unknown) {
  const aal = (context as StaffCtx).claims?.aal;
  if (aal !== "aal2") throw new Error("Two-step verification required. Please sign in again.");
}

export async function resolveStaffScope(context: unknown): Promise<StaffScope | null> {
  const ctx = context as StaffCtx;
  assertTwoStep(context);
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (isAdmin === true) return { kind: "owner" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let { data: staff } = await supabaseAdmin
    .from("partner_agency_staff")
    .select("id, agency_id")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const email = (ctx.claims?.email ?? "").trim().toLowerCase();
  if (!staff && email) {
    const { data: invited } = await supabaseAdmin
      .from("partner_agency_staff")
      .select("id, agency_id")
      .eq("email", email)
      .is("user_id", null)
      .maybeSingle();
    if (invited) {
      await supabaseAdmin.from("partner_agency_staff").update({ user_id: ctx.userId }).eq("id", invited.id);
      staff = invited;
    }
  }
  if (!staff) return null;

  const { data: agency } = await supabaseAdmin
    .from("partner_agencies")
    .select("id, name, status")
    .eq("id", staff.agency_id)
    .maybeSingle();
  if (!agency || agency.status !== "active") return null;
  return { kind: "partner", agencyId: agency.id, agencyName: agency.name };
}

export async function requireStaff(context: unknown): Promise<StaffScope> {
  const scope = await resolveStaffScope(context);
  if (!scope) throw new Error("Forbidden");
  return scope;
}

export async function requireOwner(context: unknown): Promise<void> {
  const scope = await resolveStaffScope(context);
  if (scope?.kind !== "owner") throw new Error("Forbidden");
}

export function canSeeFamily(scope: StaffScope, familyAgencyId: string | null): boolean {
  return scope.kind === "owner" || familyAgencyId === scope.agencyId;
}

export async function assertFamilyInScope(scope: StaffScope, familyId: string): Promise<void> {
  if (scope.kind === "owner") return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("families")
    .select("partner_agency_id")
    .eq("id", familyId)
    .maybeSingle();
  if (!data || !canSeeFamily(scope, data.partner_agency_id)) throw new Error("Family not found");
}

type FamilyOwnedTable = "family_documents" | "family_contacts" | "support_threads";

export async function assertRowInScope(scope: StaffScope, table: FamilyOwnedTable, id: string): Promise<void> {
  if (scope.kind === "owner") return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from(table).select("family_id").eq("id", id).maybeSingle();
  if (!data) throw new Error("Not found");
  await assertFamilyInScope(scope, (data as { family_id: string }).family_id);
}

/** Storage paths are always `<familyId>/...`. */
export async function assertPathInScope(scope: StaffScope, storagePath: string): Promise<void> {
  if (scope.kind === "owner") return;
  const familyId = storagePath.split("/")[0] ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(familyId) || storagePath.includes("..")) throw new Error("Not found");
  await assertFamilyInScope(scope, familyId);
}
