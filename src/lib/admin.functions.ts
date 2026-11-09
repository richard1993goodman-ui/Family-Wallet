import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AgreementData } from "./agreement.model";

import { assertFamilyInScope, assertPathInScope, assertRowInScope, requireStaff, resolveStaffScope } from "./staff.scope";

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    const scope = await resolveStaffScope(context);
    const features = { challenges: scope !== null, perks: scope !== null, playbooks: scope !== null };
    let agencyLogo: string | null = null;
    let agreementsEnabled = true;
    if (scope?.kind === "partner") {
      const { data: agency } = await supabaseAdmin.from("partner_agencies").select("logo_data, agreements_enabled").eq("id", scope.agencyId).maybeSingle();
      agencyLogo = agency?.logo_data ?? null;
      agreementsEnabled = agency?.agreements_enabled !== false;
    }
    return {
      features,
      isAdmin: scope !== null,
      isOwner: scope?.kind === "owner",
      agencyName: scope?.kind === "partner" ? scope.agencyName : null,
      agencyLogo,
      agreementsEnabled,
      adminExists: (count ?? 0) > 0,
    };
  });

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { ok: false as const };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listFamilies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let familyQuery = supabaseAdmin
      .from("families")
      .select("id, slug, family_name, tier_band, intro_fee_percent, fee_label, fee_amount, nanny_name, status, access_code, created_at, partner_agency_id")
      .order("created_at", { ascending: false });
    familyQuery = scope.kind === "partner" ? familyQuery.eq("partner_agency_id", scope.agencyId) : familyQuery.is("partner_agency_id", null);
    const { data, error } = await familyQuery;
    if (error) throw new Error(error.message);
    const families = data ?? [];
    const { data: dbsDocs } = await supabaseAdmin
      .from("family_documents")
      .select("family_id, issued_on")
      .eq("doc_type", "dbs")
      .not("issued_on", "is", null);
    const expiryByFamily = new Map<string, string>();
    for (const doc of dbsDocs ?? []) {
      if (doc.issued_on) expiryByFamily.set(doc.family_id, doc.issued_on);
    }
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    return families.map((f) => {
      const issued = expiryByFamily.get(f.id);
      return { ...f, dbsIssuedOn: issued ?? null, dbsExpired: !!issued && new Date(issued) < threeYearsAgo };
    });
  });

export const getFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: family, error } = await supabaseAdmin
      .from("families")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!family) throw new Error("Family not found");
    const { data: docs } = await supabaseAdmin
      .from("family_documents")
      .select("id, doc_type, file_name, storage_path, uploaded_at, visibility, issued_on, reference_label")
      .eq("family_id", data.id);
    const { data: contacts } = await supabaseAdmin
      .from("family_contacts")
      .select("id, name, relationship, phone, sort_order")
      .eq("family_id", data.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    const [{ data: profile }, { data: services }, { data: nannies }, { data: safetyDocuments }] = await Promise.all([
      supabaseAdmin.from("family_profile").select("home_address").eq("family_id", data.id).maybeSingle(),
      supabaseAdmin.from("family_services").select("*").eq("family_id", data.id).maybeSingle(),
      supabaseAdmin.from("family_nannies").select("id, name, insurance_provider, insurance_policy_number, insurance_cover_from, insurance_cover_until").eq("family_id", data.id).eq("status", "active").order("sort_order"),
      supabaseAdmin.from("nanny_safety_documents").select("id, nanny_id, document_type, file_name, storage_path, issued_on, expires_on, reference_label, visibility").eq("family_id", data.id),
    ]);
    return {
      family,
      documents: docs ?? [],
      contacts: contacts ?? [],
      homeAddress: profile?.home_address ?? "",
      services: services ?? null,
      nannies: nannies ?? [],
      safetyDocuments: safetyDocuments ?? [],
    };
  });

export type FamilyInput = {
  id?: string;
  familyName: string;
  contactEmail: string;
  contactPhone: string;
  tierBand: string;
  introFeePercent?: string;
  nannyName: string;
  nannyBio?: string;
  nannytaxCode?: string;
  nannyEmergencyName?: string;
  nannyEmergencyRelationship?: string;
  nannyEmergencyPhone?: string;
  startDate: string;
  termsAcceptedOn: string;
  notes: string;
  status: string;
  homeAddress?: string;
  /** Agency's own fee wording, e.g. "Monthly retainer" / "£180 + VAT per month". Overrides the standard band when set. */
  feeLabel?: string;
  feeAmount?: string;
  /** Owner only: which partner agency runs this family ("" = the owner agency). */
  partnerAgencyId?: string;
};

export const saveFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: FamilyInput) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateAccessCode, hashCode } = await import("./wallet.server");

    const row = {
      family_name: data.familyName.trim(),
      contact_email: data.contactEmail.trim() || null,
      contact_phone: data.contactPhone.trim() || null,
      tier_band: data.tierBand || "",
      ...(data.feeLabel !== undefined ? { fee_label: data.feeLabel.trim().slice(0, 80) || null } : {}),
      ...(data.feeAmount !== undefined ? { fee_amount: data.feeAmount.trim().slice(0, 80) || null } : {}),
      ...(data.introFeePercent !== undefined
        ? { intro_fee_percent: data.introFeePercent.trim() === "" ? null : Math.max(0, Number(data.introFeePercent) || 0) }
        : {}),
      nanny_name: data.nannyName.trim() || null,
      nanny_bio: (data.nannyBio ?? "").trim() || null,
      nannytax_code: (data.nannytaxCode ?? "").trim() || null,
      nanny_emergency_name: (data.nannyEmergencyName ?? "").trim() || null,
      nanny_emergency_relationship: (data.nannyEmergencyRelationship ?? "").trim() || null,
      nanny_emergency_phone: (data.nannyEmergencyPhone ?? "").trim() || null,
      start_date: data.startDate || null,
      terms_accepted_on: data.termsAcceptedOn || null,
      notes: data.notes.trim() || null,
      status: data.status,
      updated_at: new Date().toISOString(),
      ...(scope.kind === "partner"
        ? { partner_agency_id: scope.agencyId }
        : data.partnerAgencyId !== undefined
          ? { partner_agency_id: data.partnerAgencyId || null }
          : {}),
    };

    async function syncPrimaryNanny(familyId: string) {
      const name = data.nannyName.trim();
      if (!name) return;
      const { data: existing } = await supabaseAdmin
        .from("family_nannies")
        .select("id")
        .eq("family_id", familyId)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1);

      const nannyRow = {
        name,
        bio: (data.nannyBio ?? "").trim() || null,
        emergency_name: (data.nannyEmergencyName ?? "").trim() || null,
        emergency_relationship: (data.nannyEmergencyRelationship ?? "").trim() || null,
        emergency_phone: (data.nannyEmergencyPhone ?? "").trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (existing && existing.length > 0) {
        await supabaseAdmin.from("family_nannies").update(nannyRow).eq("id", existing[0]!.id);
      } else {
        await supabaseAdmin
          .from("family_nannies")
          .insert({ ...nannyRow, family_id: familyId, sort_order: 0 });
      }
    }

    async function syncAddress(familyId: string) {
      if (data.homeAddress === undefined) return;
      const address = data.homeAddress.trim().slice(0, 1000) || null;
      const { data: existing } = await supabaseAdmin
        .from("family_profile")
        .select("id")
        .eq("family_id", familyId)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin
          .from("family_profile")
          .update({ home_address: address, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else if (address) {
        await supabaseAdmin.from("family_profile").insert({ family_id: familyId, home_address: address });
      }
    }

    if (data.id) {
      await assertFamilyInScope(scope, data.id);
      if (scope.kind === "partner" && data.status === "active") {
        const { data: current } = await supabaseAdmin.from("families").select("status").eq("id", data.id).maybeSingle();
        if (current?.status !== "active") await (await import("./seats.server")).assertSeatAvailable(scope.agencyId);
      }
      const { error } = await supabaseAdmin.from("families").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      await syncPrimaryNanny(data.id);
      await syncAddress(data.id);
      return { id: data.id };
    }

    if (scope.kind === "partner") await (await import("./seats.server")).assertSeatAvailable(scope.agencyId);

    const base =
      data.familyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 24) || "family";
    const suffix = generateAccessCode().slice(0, 4).toLowerCase();
    const slug = `${base}-${suffix}`;
    const code = generateAccessCode();

    const { data: inserted, error } = await supabaseAdmin
      .from("families")
      .insert({
        ...row,
        slug,
        access_code: code,
        access_code_hash: hashCode(slug, code),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await syncPrimaryNanny(inserted.id);
    await syncAddress(inserted.id);
    return { id: inserted.id };
  });

export const setFamilyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: "active" | "cancelled" }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.id);
    const status = data.status === "cancelled" ? "cancelled" : "active";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (status === "active" && scope.kind === "partner") {
      const { data: current } = await supabaseAdmin.from("families").select("status").eq("id", data.id).maybeSingle();
      if (current?.status !== "active") await (await import("./seats.server")).assertSeatAvailable(scope.agencyId);
    }
    const { error } = await supabaseAdmin
      .from("families")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: docs } = await supabaseAdmin
      .from("family_documents")
      .select("storage_path")
      .eq("family_id", data.id);
    const paths = (docs ?? []).map((d) => d.storage_path).filter(Boolean);
    if (paths.length) await supabaseAdmin.storage.from("family-docs").remove(paths);
    const { error } = await supabaseAdmin.from("families").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const regenerateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateAccessCode, hashCode } = await import("./wallet.server");
    const { data: family } = await supabaseAdmin
      .from("families")
      .select("slug")
      .eq("id", data.id)
      .maybeSingle();
    if (!family) throw new Error("Family not found");
    const code = generateAccessCode();
    const { error } = await supabaseAdmin
      .from("families")
      .update({ access_code: code, access_code_hash: hashCode(family.slug, code) })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { code };
  });

export const recordDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { familyId: string; docType: string; storagePath: string; fileName: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.familyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("family_documents").upsert(
      {
        family_id: data.familyId,
        doc_type: data.docType,
        storage_path: data.storagePath,
        file_name: data.fileName,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: "family_id,doc_type" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertRowInScope(scope, "family_documents", data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc } = await supabaseAdmin
      .from("family_documents")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (doc) await supabaseAdmin.storage.from("family-docs").remove([doc.storage_path]);
    const { error } = await supabaseAdmin.from("family_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getAdminDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storagePath: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertPathInScope(scope, data.storagePath);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage
      .from("family-docs")
      .createSignedUrl(data.storagePath, 300);
    return { url: signed?.signedUrl ?? null };
  });

export const uploadDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      familyId: string;
      docType: string;
      fileName: string;
      contentType: string;
      base64: string;
      visibility?: string;
      issuedOn?: string;
      referenceLabel?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.familyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Buffer.from(data.base64, "base64");
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.familyId}/${data.docType}-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("family-docs")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { data: existing } = await supabaseAdmin
      .from("family_documents")
      .select("visibility, issued_on, reference_label")
      .eq("family_id", data.familyId)
      .eq("doc_type", data.docType)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("family_documents").upsert(
      {
        family_id: data.familyId,
        doc_type: data.docType,
        storage_path: path,
        file_name: data.fileName,
        uploaded_at: new Date().toISOString(),
        visibility: data.visibility ?? existing?.visibility ?? "document",
        issued_on: data.issuedOn || (existing?.issued_on as string | null) || null,
        reference_label: data.referenceLabel ?? existing?.reference_label ?? null,
      },
      { onConflict: "family_id,doc_type" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateDocumentMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { id: string; visibility: string; issuedOn: string; referenceLabel: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertRowInScope(scope, "family_documents", data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("family_documents")
      .update({
        visibility: data.visibility,
        issued_on: data.issuedOn || null,
        reference_label: data.referenceLabel.trim() || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const saveFamilyServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { familyId: string; payrollStatus: string; payrollStartDate: string; payrollNotes: string; curationStatus: string; curationNotes: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.familyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("family_services").upsert({
      family_id: data.familyId,
      payroll_status: data.payrollStatus,
      payroll_start_date: data.payrollStartDate || null,
      payroll_notes: data.payrollNotes.trim() || null,
      curation_status: data.curationStatus,
      curation_notes: data.curationNotes.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "family_id" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const saveNannyInsurance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { familyId: string; nannyId: string; provider: string; policyNumber: string; coverFrom: string; coverUntil: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.familyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("family_nannies").update({
      insurance_provider: data.provider.trim() || null,
      insurance_policy_number: data.policyNumber.trim() || null,
      insurance_cover_from: data.coverFrom || null,
      insurance_cover_until: data.coverUntil || null,
      updated_at: new Date().toISOString(),
    }).eq("id", data.nannyId).eq("family_id", data.familyId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const uploadSafetyDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { familyId: string; nannyId: string; documentType: string; fileName: string; contentType: string; base64: string; issuedOn: string; expiresOn: string; referenceLabel: string; visibility: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.familyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.length > 10 * 1024 * 1024) throw new Error("Document must be under 10MB");
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.familyId}/safety-${data.nannyId}-${data.documentType}-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabaseAdmin.storage.from("family-docs").upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    const { data: existing } = await supabaseAdmin.from("nanny_safety_documents").select("storage_path").eq("nanny_id", data.nannyId).eq("document_type", data.documentType).maybeSingle();
    const { error } = await supabaseAdmin.from("nanny_safety_documents").upsert({
      family_id: data.familyId, nanny_id: data.nannyId, document_type: data.documentType,
      storage_path: path, file_name: data.fileName, issued_on: data.issuedOn || null,
      expires_on: data.expiresOn || null, reference_label: data.referenceLabel.trim() || null,
      visibility: data.visibility,
    }, { onConflict: "nanny_id,document_type" });
    if (error) throw new Error(error.message);
    if (existing?.storage_path && existing.storage_path !== path) await supabaseAdmin.storage.from("family-docs").remove([existing.storage_path]);
    return { ok: true as const };
  });

export const uploadNannyPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { familyId: string; fileName: string; contentType: string; base64: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.familyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Buffer.from(data.base64, "base64");
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.familyId}/nanny-photo-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("family-docs")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    const { error } = await supabaseAdmin
      .from("families")
      .update({ nanny_photo_path: path, updated_at: new Date().toISOString() })
      .eq("id", data.familyId);
    if (error) throw new Error(error.message);

    const { data: primary } = await supabaseAdmin
      .from("family_nannies")
      .select("id")
      .eq("family_id", data.familyId)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1);
    if (primary && primary.length > 0) {
      await supabaseAdmin
        .from("family_nannies")
        .update({ photo_path: path, updated_at: new Date().toISOString() })
        .eq("id", primary[0]!.id);
    }
    return { ok: true as const };
  });

export const addContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { familyId: string; name: string; relationship: string; phone: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.familyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("family_contacts")
      .select("id", { count: "exact", head: true })
      .eq("family_id", data.familyId);
    if ((count ?? 0) >= 3) throw new Error("Up to 3 emergency contacts per family");
    const { error } = await supabaseAdmin.from("family_contacts").insert({
      family_id: data.familyId,
      name: data.name.trim(),
      relationship: data.relationship.trim() || null,
      phone: data.phone.trim(),
      sort_order: count ?? 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertRowInScope(scope, "family_contacts", data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("family_contacts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------------- Support inbox ---------------- */

export const listSupportThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let threadQuery = supabaseAdmin
      .from("support_threads")
      .select("id, family_id, subject, status, last_sender, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    const ownQuery = supabaseAdmin.from("families").select("id");
    const { data: own } = await (scope.kind === "partner" ? ownQuery.eq("partner_agency_id", scope.agencyId) : ownQuery.is("partner_agency_id", null));
    const ownIds = (own ?? []).map((f) => f.id);
    if (ownIds.length === 0) return [];
    threadQuery = threadQuery.in("family_id", ownIds);
    const { data: threads, error } = await threadQuery;
    if (error) throw new Error(error.message);
    const ids = (threads ?? []).map((t) => t.id);
    const familyIds = [...new Set((threads ?? []).map((t) => t.family_id))];
    const [{ data: messages }, { data: families }] = await Promise.all([
      ids.length
        ? supabaseAdmin
            .from("support_messages")
            .select("id, thread_id, sender, body, created_at")
            .in("thread_id", ids)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as { id: string; thread_id: string; sender: string; body: string; created_at: string }[] }),
      familyIds.length
        ? supabaseAdmin.from("families").select("id, family_name").in("id", familyIds)
        : Promise.resolve({ data: [] as { id: string; family_name: string }[] }),
    ]);
    const nameById = new Map((families ?? []).map((f) => [f.id, f.family_name]));
    return (threads ?? []).map((thread) => ({
      ...thread,
      familyName: nameById.get(thread.family_id) ?? "Family",
      messages: (messages ?? []).filter((m) => m.thread_id === thread.id),
      needsReply: thread.last_sender !== "admin" && thread.status === "open",
    }));
  });

export const replyToThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { threadId: string; body: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertRowInScope(scope, "support_threads", data.threadId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const body = data.body.trim().slice(0, 4000);
    if (!body) throw new Error("Please write a reply");
    const { error } = await supabaseAdmin
      .from("support_messages")
      .insert({ thread_id: data.threadId, sender: "admin", body });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("support_threads")
      .update({
        last_sender: "admin",
        family_unread: true,
        nanny_unread: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.threadId);
    return { ok: true as const };
  });

export const setThreadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { threadId: string; status: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertRowInScope(scope, "support_threads", data.threadId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("support_threads")
      .update({ status: data.status })
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------------- Read-only family hub view ---------------- */

export const getFamilyHub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: family }, { data: profile }, { data: children }, { data: logs }, { data: entries }] =
      await Promise.all([
        supabaseAdmin.from("families").select("family_name").eq("id", data.id).maybeSingle(),
        supabaseAdmin.from("family_profile").select("*").eq("family_id", data.id).maybeSingle(),
        supabaseAdmin
          .from("family_children")
          .select("*")
          .eq("family_id", data.id)
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("daily_logs")
          .select("*")
          .eq("family_id", data.id)
          .order("log_date", { ascending: false })
          .limit(10),
        supabaseAdmin
          .from("planner_entries")
          .select("id, entry_date, time_label, title, child_name")
          .eq("family_id", data.id)
          .gte("entry_date", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
          .order("entry_date", { ascending: true }),
      ]);
    return {
      familyName: family?.family_name ?? "Family",
      profile: profile ?? null,
      children: children ?? [],
      logs: logs ?? [],
      entries: entries ?? [],
    };
  });

/* ---------------- Nanny agreement & signatures ---------------- */

export const getAgreementAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { familyId: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.familyId);
    const { adminLoadAgreement } = await import("./agreement.server");
    return adminLoadAgreement(data.familyId);
  });

export const saveAgreementAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { familyId: string; fields: AgreementData; publish: boolean }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.familyId);
    const { adminSaveAgreement } = await import("./agreement.server");
    return adminSaveAgreement(data.familyId, data.fields, data.publish);
  });

export const signAsAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { familyId: string; docKind: "agreement" | "terms"; name: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.familyId);
    const { adminSign } = await import("./agreement.server");
    return adminSign(data.familyId, data.docKind, data.name);
  });

/**
 * Everything the agency dashboard needs in one call: the plan allowance, headline counts and a
 * row per household. Partner staff see their own agency; the owner sees every household.
 */
export const getAgencyOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { allowanceUsage, isActiveHousehold, isAgencyPlan } = await import("./agency-plans");

    let familyQuery = supabaseAdmin
      .from("families")
      .select("id, slug, family_name, nanny_name, status, access_code, created_at, last_active_at, partner_agency_id, contact_email, invite_sent_at, agreement_policy")
      .order("created_at", { ascending: false });
    familyQuery = scope.kind === "partner" ? familyQuery.eq("partner_agency_id", scope.agencyId) : familyQuery.is("partner_agency_id", null);
    const { data: families, error } = await familyQuery;
    if (error) throw new Error(error.message);
    const rows = families ?? [];
    const ids = rows.map((f) => f.id);

    const [{ data: staff }, { data: dbsDocs }, agencyRow] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("family_nannies").select("family_id, role").in("family_id", ids).eq("status", "active")
        : Promise.resolve({ data: [] as { family_id: string; role: string }[] }),
      ids.length
        ? supabaseAdmin.from("family_documents").select("family_id, issued_on").in("family_id", ids).eq("doc_type", "dbs").not("issued_on", "is", null)
        : Promise.resolve({ data: [] as { family_id: string; issued_on: string | null }[] }),
      scope.kind === "partner"
        ? supabaseAdmin.from("partner_agencies").select("plan, household_allowance").eq("id", scope.agencyId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const staffByFamily = new Map<string, string[]>();
    for (const s of staff ?? []) staffByFamily.set(s.family_id, [...(staffByFamily.get(s.family_id) ?? []), s.role]);
    const dbsIssued = new Map((dbsDocs ?? []).map((d) => [d.family_id, d.issued_on]));
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const households = rows.map((f) => {
      const roles = staffByFamily.get(f.id) ?? [];
      const issued = dbsIssued.get(f.id);
      return {
        id: f.id,
        slug: f.slug,
        name: f.family_name,
        status: f.status,
        accessCode: f.access_code,
        createdAt: f.created_at,
        lastActiveAt: f.last_active_at,
        activeThisMonth: f.status === "active" && isActiveHousehold(f.last_active_at),
        notOpened: f.status === "active" && !f.last_active_at,
        staffRoles: roles,
        staffCount: roles.length,
        nannyName: f.nanny_name,
        dbsExpired: !!issued && new Date(issued) < threeYearsAgo,
        partnerAgencyId: f.partner_agency_id,
        contactEmail: f.contact_email,
        inviteSentAt: f.invite_sent_at,
        agreementPolicy: f.agreement_policy,
      };
    });

    const active = households.filter((h) => h.status === "active");
    const activeThisMonth = households.filter((h) => h.activeThisMonth).length;
    const plan = agencyRow.data?.plan;
    return {
      scope: scope.kind,
      agency:
        scope.kind === "partner"
          ? {
              name: scope.agencyName,
              usage: allowanceUsage(isAgencyPlan(plan) ? plan : "partner", agencyRow.data?.household_allowance ?? null, active.length),
            }
          : null,
      totals: {
        households: active.length,
        activeThisMonth,
        quiet: active.filter((h) => !h.activeThisMonth && !h.notOpened).length,
        notOpened: active.filter((h) => h.notOpened).length,
        cancelled: households.length - active.length,
        staff: active.reduce((n, h) => n + h.staffCount, 0),
      },
      households,
    };
  });

/** Emails a family its wallet link and access code on the agency's behalf. */
export const sendFamilyInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    await assertFamilyInScope(scope, data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: family } = await supabaseAdmin
      .from("families")
      .select("slug, family_name, access_code, contact_email, status, partner_agency:partner_agencies(name, brand_name)")
      .eq("id", data.id)
      .maybeSingle();
    if (!family) throw new Error("Family not found");
    if (family.status !== "active") throw new Error("That family is cancelled.");
    const to = (family.contact_email ?? "").trim();
    if (!to) throw new Error("Add an email address for this family first.");
    const { emailConfigured, sendEmail } = await import("./email.server");
    if (!emailConfigured()) throw new Error("Email isn't set up yet, so copy the link and code instead.");
    const { buildWalletEmail } = await import("./wallet-email");
    const { siteUrl } = await import("./site");
    const agencyName = family.partner_agency?.brand_name || family.partner_agency?.name || undefined;
    const message = buildWalletEmail(
      "invite",
      [{ familyName: family.family_name, url: siteUrl(`/w/${family.slug}`), code: family.access_code }],
      { agencyName, supportEmail: process.env["EMAIL_REPLY_TO"] },
    );
    if (!(await sendEmail({ to, ...message }))) throw new Error("The email couldn't be sent. Try again in a minute.");
    await supabaseAdmin.from("families").update({ invite_sent_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true as const };
  });

/** Sets the nanny agreement on, off, or "family decides" for the families an agency has chosen. */
export const setFamiliesAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ids: string[]; policy: "family" | "on" | "off" }) => data)
  .handler(async ({ data, context }) => {
    const scope = await requireStaff(context);
    const { isAgreementPolicy } = await import("./agreement-mode");
    if (!isAgreementPolicy(data.policy)) throw new Error("Choose on, off, or family decides.");
    const ids = [...new Set(Array.isArray(data.ids) ? data.ids : [])].slice(0, 200);
    if (!ids.length) throw new Error("Choose at least one family.");
    for (const id of ids) await assertFamilyInScope(scope, id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("families")
      .update({ agreement_policy: data.policy, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw new Error("Couldn't save that.");
    return { count: ids.length };
  });
