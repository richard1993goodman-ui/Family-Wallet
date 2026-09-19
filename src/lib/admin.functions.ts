import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AgreementData } from "./agreement.model";

type Ctx = { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string };

async function assertAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Forbidden");
}

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true, adminExists: (count ?? 0) > 0 };
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
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("families")
      .select("id, slug, family_name, tier_band, nanny_name, status, access_code, created_at")
      .order("created_at", { ascending: false });
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
    await assertAdmin(context as unknown as Ctx);
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
    return { family, documents: docs ?? [], contacts: contacts ?? [] };
  });

export type FamilyInput = {
  id?: string;
  familyName: string;
  contactEmail: string;
  contactPhone: string;
  tierBand: string;
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
};

export const saveFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: FamilyInput) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateAccessCode, hashCode } = await import("./wallet.server");

    const row = {
      family_name: data.familyName.trim(),
      contact_email: data.contactEmail.trim() || null,
      contact_phone: data.contactPhone.trim() || null,
      tier_band: data.tierBand,
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
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("families").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

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
    return { id: inserted.id };
  });

export const regenerateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
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
    await assertAdmin(context as unknown as Ctx);
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
    await assertAdmin(context as unknown as Ctx);
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
    await assertAdmin(context as unknown as Ctx);
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
    await assertAdmin(context as unknown as Ctx);
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
    await assertAdmin(context as unknown as Ctx);
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

export const uploadNannyPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { familyId: string; fileName: string; contentType: string; base64: string }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
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
    return { ok: true as const };
  });

export const addContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { familyId: string; name: string; relationship: string; phone: string }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
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
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("family_contacts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------------- Support inbox ---------------- */

export const listSupportThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: threads, error } = await supabaseAdmin
      .from("support_threads")
      .select("id, family_id, subject, status, last_sender, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
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
      needsReply: thread.last_sender === "family" && thread.status === "open",
    }));
  });

export const replyToThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { threadId: string; body: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const body = data.body.trim().slice(0, 4000);
    if (!body) throw new Error("Please write a reply");
    const { error } = await supabaseAdmin
      .from("support_messages")
      .insert({ thread_id: data.threadId, sender: "admin", body });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("support_threads")
      .update({ last_sender: "admin", family_unread: true, updated_at: new Date().toISOString() })
      .eq("id", data.threadId);
    return { ok: true as const };
  });

export const setThreadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { threadId: string; status: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
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
    await assertAdmin(context as unknown as Ctx);
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
    await assertAdmin(context as unknown as Ctx);
    const { adminLoadAgreement } = await import("./agreement.server");
    return adminLoadAgreement(data.familyId);
  });

export const saveAgreementAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { familyId: string; fields: AgreementData; publish: boolean }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { adminSaveAgreement } = await import("./agreement.server");
    return adminSaveAgreement(data.familyId, data.fields, data.publish);
  });

export const signAsAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { familyId: string; docKind: "agreement" | "terms"; name: string }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { adminSign } = await import("./agreement.server");
    return adminSign(data.familyId, data.docKind, data.name);
  });
