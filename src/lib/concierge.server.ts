import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeAgreement, workingDayHours } from "./agreement.model";
import { askSupport, requireFamily, requireSharedFamily } from "./family.server";
import { sessionAccess } from "./wallet.server";

export async function loadConcierge(slug: string) {
  const family = await requireFamily(slug);
  if (!family) return null;
  const [{ data: service }, { data: agreement }, { data: familyRow }] = await Promise.all([
    supabaseAdmin.from("family_services").select("payroll_status, payroll_start_date, payroll_notes, curation_status, curation_notes, updated_at").eq("family_id", family.id).maybeSingle(),
    supabaseAdmin.from("nanny_agreements").select("agreement_data").eq("family_id", family.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from("families").select("nannytax_code").eq("id", family.id).single(),
  ]);
  const details = agreement ? normalizeAgreement(agreement.agreement_data) : null;
  return {
    familyName: family.family_name,
    nannytaxCode: familyRow?.nannytax_code ?? null,
    service: service ?? { payroll_status: "not_started", payroll_start_date: null, payroll_notes: null, curation_status: "not_started", curation_notes: null, updated_at: null },
    agreement: details ? {
      hourlyRate: Number(details.hourlyRate) || 0,
      rateBasis: details.rateBasis,
      weeklyHours: details.workingDays.filter((day) => day.enabled).reduce((sum, day) => sum + workingDayHours(day), 0),
      workingWeeks: Number(details.weeksPerYear) || 52,
    } : null,
  };
}

export async function requestConcierge(slug: string, kind: "payroll" | "curation", message: string) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can request this service");
  const subject = kind === "payroll" ? "Nannytax managed setup request" : "Private nanny curation request";
  await askSupport(slug, subject, message || (kind === "payroll" ? "Please help us set up payroll through Nannytax." : "Please contact us about a private nanny search."));
  const field = kind === "payroll" ? { payroll_status: "introduction_requested" } : { curation_status: "brief_received" };
  const { error } = await supabaseAdmin.from("family_services").upsert({ family_id: family.id, ...field, updated_at: new Date().toISOString() }, { onConflict: "family_id" });
  if (error) throw new Error(error.message);
}

export async function loadSafety(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const session = await sessionAccess(slug);
  const [{ data: nannies }, { data: documents }] = await Promise.all([
    supabaseAdmin.from("family_nannies").select("id, name, insurance_provider, insurance_policy_number, insurance_cover_from, insurance_cover_until").eq("family_id", family.id).eq("status", "active").order("sort_order"),
    supabaseAdmin.from("nanny_safety_documents").select("id, nanny_id, document_type, file_name, issued_on, expires_on, reference_label, visibility").eq("family_id", family.id).neq("visibility", "hidden"),
  ]);
  const visibleNannies = family.access === "nanny" ? (nannies ?? []).filter((n) => n.id === session?.nannyId) : (nannies ?? []);
  return { familyName: family.family_name, access: family.access, nannies: visibleNannies.map((nanny) => ({ ...nanny, documents: (documents ?? []).filter((doc) => doc.nanny_id === nanny.id) })) };
}

export async function safetyDocumentUrl(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const session = await sessionAccess(slug);
  const { data: doc } = await supabaseAdmin.from("nanny_safety_documents").select("storage_path, nanny_id, visibility").eq("id", id).eq("family_id", family.id).maybeSingle();
  if (!doc || doc.visibility !== "document") return null;
  if (family.access === "nanny" && doc.nanny_id !== session?.nannyId) return null;
  const { data } = await supabaseAdmin.storage.from("family-docs").createSignedUrl(doc.storage_path, 300);
  return data?.signedUrl ?? null;
}