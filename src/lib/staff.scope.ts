// Agency staff scope: the the owner agency owner (admin role) sees every family;
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

/* ---------- Premium content (challenges, perks, playbooks) ---------- */

export type ContentFeature = "challenges" | "perks" | "playbooks";
type FeatureFlags = { allow_challenges: boolean; allow_perks: boolean; allow_playbooks: boolean; status?: string };

/** Every active partner gets every content tool; legacy allow_* values are not access gates. */
export function partnerContentAllowed(agency: FeatureFlags | null | undefined, _feature: ContentFeature): boolean {
  return !!agency && agency.status === "active";
}

/** Returns the agency that owns content made by this staff member: null = the owner agency (owner). */
export async function requireContentScope(context: unknown, feature: ContentFeature): Promise<string | null> {
  const scope = await requireStaff(context);
  if (scope.kind === "owner") return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("partner_agencies")
    .select("allow_challenges, allow_perks, allow_playbooks, status")
    .eq("id", scope.agencyId)
    .maybeSingle();
  if (!partnerContentAllowed(data, feature)) throw new Error("Agency access is paused or unavailable");
  return scope.agencyId;
}

/** Content rows must belong to the caller's agency (null = owner content). */
export async function assertContentRow(
  table: "agency_challenges" | "partner_perks" | "seasonal_playbooks",
  id: string,
  agencyId: string | null,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from(table).select("agency_id").eq("id", id).maybeSingle();
  if (!data || (data.agency_id ?? null) !== agencyId) throw new Error("Not found");
}

/** Families picked as recipients must sit inside the caller's agency. */
export async function assertFamiliesInAgency(familyIds: string[], agencyId: string | null): Promise<void> {
  if (!familyIds.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("families").select("id, partner_agency_id").in("id", familyIds);
  const ok = (data ?? []).length === new Set(familyIds).size && (data ?? []).every((f) => (f.partner_agency_id ?? null) === agencyId);
  if (!ok) throw new Error("Family not found");
}

/** Which agency's content a wallet family sees, or false when their agency is unavailable. */
export async function walletContentAgency(familyId: string, feature: ContentFeature): Promise<string | null | false> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: fam } = await supabaseAdmin.from("families").select("partner_agency_id").eq("id", familyId).maybeSingle();
  const agencyId = fam?.partner_agency_id ?? null;
  if (!agencyId) return null;
  const { data: agency } = await supabaseAdmin
    .from("partner_agencies")
    .select("allow_challenges, allow_perks, allow_playbooks, status")
    .eq("id", agencyId)
    .maybeSingle();
  return partnerContentAllowed(agency, feature) ? agencyId : false;
}
