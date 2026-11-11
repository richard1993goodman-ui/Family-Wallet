import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isActiveHousehold, isAgencyPlan } from "./agency-plans";
import { requireOwner, requireStaff } from "./staff.scope";

// Owner-only management of partner agencies and the staff emails allowed into each.

export const listPartnerAgencies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: agencies, error }, { data: staff }, { data: families }] = await Promise.all([
      supabaseAdmin.from("partner_agencies").select("*").order("created_at", { ascending: true }),
      supabaseAdmin.from("partner_agency_staff").select("id, agency_id, email, user_id").order("created_at"),
      supabaseAdmin.from("families").select("partner_agency_id, status, last_active_at").not("partner_agency_id", "is", null),
    ]);
    if (error) throw new Error(error.message);
    return (agencies ?? []).map((a) => ({
      ...a,
      staff: (staff ?? []).filter((s) => s.agency_id === a.id).map((s) => ({ id: s.id, email: s.email, joined: !!s.user_id })),
      activeFamilies: (families ?? []).filter((f) => f.partner_agency_id === a.id && f.status === "active").length,
      activeThisMonth: (families ?? []).filter((f) => f.partner_agency_id === a.id && f.status === "active" && isActiveHousehold(f.last_active_at)).length,
    }));
  });

export const savePartnerAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; contactEmail: string; contactPhone: string; status: string; brandName?: string; introPricing?: boolean; shortName?: string; allowChallenges?: boolean; allowPerks?: boolean; allowPlaybooks?: boolean; plan?: string; householdAllowance?: number | null }) => d)
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const name = data.name.trim().slice(0, 120);
    if (!name) throw new Error("Agency name is required");
    const row = {
      name,
      contact_email: data.contactEmail.trim() || null,
      contact_phone: data.contactPhone.trim() || null,
      status: data.status === "paused" ? "paused" : "active",
      brand_name: data.brandName?.trim().slice(0, 120) || null,
      intro_pricing: !!data.introPricing,
      short_name: data.shortName?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || null,
      allow_challenges: true,
      allow_perks: true,
      allow_playbooks: true,
      // Only touched when the caller sends them, so unrelated saves never reset an agency's plan.
      ...(data.plan !== undefined ? { plan: isAgencyPlan(data.plan) ? data.plan : "partner" } : {}),
      ...(data.householdAllowance !== undefined
        ? { household_allowance: data.householdAllowance === null ? null : Math.max(0, Math.floor(Number(data.householdAllowance)) || 0) }
        : {}),
      updated_at: new Date().toISOString(),
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Every agency always gets its own unique page + demo link: derive a handle from the name when blank.
    if (!row.short_name) {
      const base = (data.brandName?.trim() || name).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 34) || "agency";
      const { data: taken } = await supabaseAdmin.from("partner_agencies").select("id, short_name").ilike("short_name", `${base}%`);
      const used = new Set((taken ?? []).filter((t) => t.id !== data.id).map((t) => (t.short_name ?? "").toLowerCase()));
      let candidate = base;
      for (let i = 2; used.has(candidate); i++) candidate = `${base}-${i}`;
      row.short_name = candidate;
    }
    if (data.id) {
      const { error } = await supabaseAdmin.from("partner_agencies").update(row).eq("id", data.id);
      if (error) throw new Error(error.code === "23505" ? "That web address is already taken" : error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin.from("partner_agencies").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const setAgencyLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; logo: string | null }) => {
    if (d.logo !== null && (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(d.logo) || d.logo.length > 400000)) throw new Error("Logo must be a PNG, JPG, WebP or SVG under 280KB");
    return d;
  })
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("partner_agencies").update({ logo_data: data.logo, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addAgencyStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { agencyId: string; email: string }) => d)
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const email = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("partner_agency_staff").insert({ agency_id: data.agencyId, email });
    if (error) throw new Error(error.code === "23505" ? "That email is already linked to an agency" : error.message);
    return { ok: true as const };
  });

// Owner-only: create a one-time setup/reset link so the owner can send it directly
// when a staff member's company inbox blocks or strips automated emails.
export const getStaffSetupLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PUBLIC_SITE_URL } = await import("@/lib/site");
    const { data: staff } = await supabaseAdmin.from("partner_agency_staff").select("email, user_id, agency_id").eq("id", data.id).maybeSingle();
    if (!staff) throw new Error("Staff member not found");
    const { data: agency } = await supabaseAdmin.from("partner_agencies").select("status").eq("id", staff.agency_id).maybeSingle();
    if (agency?.status !== "active") throw new Error("This agency is paused — reactivate it first");
    const options = { redirectTo: `${PUBLIC_SITE_URL}/auth?setup=1` };
    let res = await supabaseAdmin.auth.admin.generateLink({ type: "invite", email: staff.email, options });
    if (res.error) res = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email: staff.email, options });
    const link = res.data?.properties?.action_link;
    if (res.error || !link) {
      console.error("setup link failed", res.error?.message);
      throw new Error("Couldn't create a setup link — please try again");
    }
    return { link };
  });

export const removeAgencyStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("partner_agency_staff").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deletePartnerAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("families")
      .select("id", { count: "exact", head: true })
      .eq("partner_agency_id", data.id);
    if ((count ?? 0) > 0) {
      throw new Error(`This agency still has ${count} ${count === 1 ? "family" : "families"}. Delete or move them first.`);
    }
    const { error } = await supabaseAdmin.from("partner_agencies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Each agency exports its own records (30-day exit export). The platform owner cannot export a partner agency's families.
const EXPORT_TABLES = [
  "family_children", "family_contacts", "family_profile", "family_nannies", "nanny_agreements",
  "document_signatures", "family_documents", "nanny_safety_documents", "timesheet_shifts", "leave_requests",
  "expense_claims", "medication_doses", "handover_checklists", "daily_logs", "planner_entries",
  "training_attempts", "review_checkins", "sports_passport_entries", "travel_trips", "family_moments", "care_events",
] as const;

export const setMyAgencyAgreements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled: boolean }) => d)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    if (scope.kind !== "partner") throw new Error("Your own households choose this themselves.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("partner_agencies")
      .update({ agreements_enabled: data.enabled === true })
      .eq("id", scope.agencyId);
    if (error) throw new Error("Couldn't save that.");
    return { ok: true as const };
  });

export const exportMyAgencyRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const agencyId = scope.kind === "partner" ? scope.agencyId : null;
    // Partner agencies may export their own agency record only, never family data.
    if (scope.kind === "partner") {
      const { data: own } = await supabaseAdmin.from("partner_agencies").select("*").eq("id", scope.agencyId).maybeSingle();
      return JSON.stringify({ exportedAt: new Date().toISOString(), agency: own, families: [], records: {} }, null, 2);
    }
    const { data: agency } = agencyId
      ? await supabaseAdmin.from("partner_agencies").select("*").eq("id", agencyId).maybeSingle()
      : { data: null };
    const familyQuery = supabaseAdmin
      .from("families")
      .select("id, slug, family_name, contact_email, contact_phone, tier_band, nanny_name, start_date, status, notes, created_at, updated_at");
    const { data: families } = await (agencyId ? familyQuery.eq("partner_agency_id", agencyId) : familyQuery.is("partner_agency_id", null));
    const ids = (families ?? []).map((f) => f.id);
    const records: Record<string, unknown[]> = {};
    for (const t of EXPORT_TABLES) {
      if (!ids.length) { records[t] = []; continue; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await (supabaseAdmin.from(t as any) as any).select("*").in("family_id", ids);
      records[t] = (rows ?? []).map((r: Record<string, unknown>) => {
        const { nanny_code, nanny_code_hash, ...rest } = r;
        void nanny_code; void nanny_code_hash;
        return rest;
      });
    }
    return JSON.stringify({ exportedAt: new Date().toISOString(), agency, families: families ?? [], records }, null, 2);
  });
