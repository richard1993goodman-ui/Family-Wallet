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
  .inputValidator((d: { id?: string; name: string; contactEmail: string; contactPhone: string; status: string }) => d)
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const name = data.name.trim().slice(0, 120);
    if (!name) throw new Error("Agency name is required");
    const row = {
      name,
      contact_email: data.contactEmail.trim() || null,
      contact_phone: data.contactPhone.trim() || null,
      status: data.status === "paused" ? "paused" : "active",
      updated_at: new Date().toISOString(),
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin.from("partner_agencies").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin.from("partner_agencies").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
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
