import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireOwner } from "./staff.scope";

// Owner-only management of partner agencies and the staff emails allowed into each.

export const listPartnerAgencies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: agencies, error }, { data: staff }, { data: families }] = await Promise.all([
      supabaseAdmin.from("partner_agencies").select("*").order("created_at", { ascending: true }),
      supabaseAdmin.from("partner_agency_staff").select("id, agency_id, email, user_id").order("created_at"),
      supabaseAdmin.from("families").select("partner_agency_id, status").not("partner_agency_id", "is", null),
    ]);
    if (error) throw new Error(error.message);
    return (agencies ?? []).map((a) => ({
      ...a,
      staff: (staff ?? []).filter((s) => s.agency_id === a.id).map((s) => ({ id: s.id, email: s.email, joined: !!s.user_id })),
      activeFamilies: (families ?? []).filter((f) => f.partner_agency_id === a.id && f.status === "active").length,
    }));
  });

export const savePartnerAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; contactEmail: string; contactPhone: string; status: string; brandName?: string; introPricing?: boolean; shortName?: string; allowChallenges?: boolean; allowPerks?: boolean; allowPlaybooks?: boolean }) => d)
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
      updated_at: new Date().toISOString(),
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

// Owner-only export of every record held for one partner agency (supports the 30-day exit export).
const EXPORT_TABLES = [
  "family_children", "family_contacts", "family_profile", "family_nannies", "nanny_agreements",
  "document_signatures", "family_documents", "nanny_safety_documents", "timesheet_shifts", "leave_requests",
  "expense_claims", "medication_doses", "handover_checklists", "daily_logs", "planner_entries",
  "training_attempts", "review_checkins", "sports_passport_entries", "travel_trips", "family_moments",
] as const;

export const exportAgencyRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: agency } = await supabaseAdmin.from("partner_agencies").select("*").eq("id", data.id).maybeSingle();
    if (!agency) throw new Error("Agency not found");
    const { data: families } = await supabaseAdmin
      .from("families")
      .select("id, slug, family_name, contact_email, contact_phone, tier_band, nanny_name, start_date, status, notes, created_at, updated_at")
      .eq("partner_agency_id", data.id);
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
