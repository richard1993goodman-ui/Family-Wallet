import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";

import {
  addContact,
  deleteContact,
  deleteDocument,
  getAdminDocumentUrl,
  deleteFamily,
  getFamily,
  regenerateCode,
  saveFamily,
  saveFamilyServices,
  saveNannyInsurance,
  uploadSafetyDocument,
  updateDocumentMeta,
  uploadDocument,
  uploadNannyPhoto,
} from "@/lib/admin.functions";
import { TIER_BANDS } from "@/lib/tiers";
import { CURATION_STATUSES, PAYROLL_STATUSES, SAFETY_DOCUMENTS } from "@/lib/concierge.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/family/$id")({
  head: () => ({
    meta: [
      { title: "Family details — Athlete Mannies Family Vault" },
      { name: "description", content: "Edit a family's vault, documents and membership." },
      { property: "og:title", content: "Family details — Athlete Mannies Family Vault" },
      { property: "og:description", content: "Edit a family's vault, documents and membership." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FamilyDetail,
});

const DOC_TYPES = [
  { key: "agreement", label: "Nanny agreement (PDF)", accept: "application/pdf" },
  { key: "cv", label: "Nanny CV (PDF)", accept: "application/pdf" },
];

const CHECK_DOCS = [
  { key: "dbs", label: "DBS certificate" },
  { key: "id_check", label: "ID / right to work" },
  { key: "reference_1", label: "Reference 1" },
  { key: "reference_2", label: "Reference 2" },
];

type DocRow = {
  id: string;
  doc_type: string;
  file_name: string;
  storage_path: string;
  visibility: string;
  issued_on: string | null;
  reference_label: string | null;
};

function FamilyDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const getFamilyFn = useServerFn(getFamily);
  const saveFn = useServerFn(saveFamily);
  const saveServicesFn = useServerFn(saveFamilyServices);
  const saveInsuranceFn = useServerFn(saveNannyInsurance);
  const uploadSafetyFn = useServerFn(uploadSafetyDocument);
  const regenFn = useServerFn(regenerateCode);
  const uploadFn = useServerFn(uploadDocument);
  const photoFn = useServerFn(uploadNannyPhoto);
  const metaFn = useServerFn(updateDocumentMeta);
  const deleteFn = useServerFn(deleteDocument);
  const docUrlFn = useServerFn(getAdminDocumentUrl);
  const addContactFn = useServerFn(addContact);
  const deleteContactFn = useServerFn(deleteContact);
  const deleteFamilyFn = useServerFn(deleteFamily);
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["family", id],
    queryFn: () => getFamilyFn({ data: { id } }),
  });

  const [form, setForm] = useState({
    familyName: "",
    contactEmail: "",
    contactPhone: "",
    tierBand: "3",
    nannyName: "",
    nannyBio: "",
    nannytaxCode: "",
    nannyEmergencyName: "",
    nannyEmergencyRelationship: "",
    nannyEmergencyPhone: "",
    startDate: "",
    termsAcceptedOn: "",
    notes: "",
    status: "active",
    homeAddress: "",
  });
  const [uploading, setUploading] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: "", relationship: "", phone: "" });
  const [services, setServices] = useState({ payrollStatus: "not_started", payrollStartDate: "", payrollNotes: "", curationStatus: "not_started", curationNotes: "" });

  useEffect(() => {
    const f = query.data?.family;
    if (!f) return;
    setForm({
      familyName: f.family_name ?? "",
      contactEmail: f.contact_email ?? "",
      contactPhone: f.contact_phone ?? "",
      tierBand: f.tier_band ?? "3",
      nannyName: f.nanny_name ?? "",
      nannyBio: f.nanny_bio ?? "",
      nannytaxCode: f.nannytax_code ?? "",
      nannyEmergencyName: f.nanny_emergency_name ?? "",
      nannyEmergencyRelationship: f.nanny_emergency_relationship ?? "",
      nannyEmergencyPhone: f.nanny_emergency_phone ?? "",
      startDate: f.start_date ?? "",
      termsAcceptedOn: f.terms_accepted_on ?? "",
      notes: f.notes ?? "",
      status: f.status === "active" ? "active" : "cancelled",
      homeAddress: query.data?.homeAddress ?? "",
    });
  }, [query.data?.family, query.data?.homeAddress]);

  useEffect(() => {
    const value = query.data?.services;
    setServices({ payrollStatus: value?.payroll_status ?? "not_started", payrollStartDate: value?.payroll_start_date ?? "", payrollNotes: value?.payroll_notes ?? "", curationStatus: value?.curation_status ?? "not_started", curationNotes: value?.curation_notes ?? "" });
  }, [query.data?.services]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["family", id] });
    await queryClient.invalidateQueries({ queryKey: ["families"] });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveFn({ data: { id, ...form } });
      toast.success("Saved");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  async function fileToBase64(file: File) {
    const buffer = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  async function onUpload(docType: string, file: File) {
    setUploading(docType);
    try {
      await uploadFn({
        data: {
          familyId: id,
          docType,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          base64: await fileToBase64(file),
        },
      });
      toast.success("Uploaded");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function onPhotoUpload(file: File) {
    setUploading("nanny_photo");
    try {
      await photoFn({
        data: {
          familyId: id,
          fileName: file.name,
          contentType: file.type || "image/jpeg",
          base64: await fileToBase64(file),
        },
      });
      toast.success("Photo uploaded");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function onSafetyUpload(nannyId: string, documentType: string, file: File) {
    const key = `${nannyId}-${documentType}`; setUploading(key);
    try {
      await uploadSafetyFn({ data: { familyId: id, nannyId, documentType, fileName: file.name, contentType: file.type || "application/octet-stream", base64: await fileToBase64(file), issuedOn: "", expiresOn: "", referenceLabel: "", visibility: "badge" } });
      toast.success("Safety record uploaded"); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); } finally { setUploading(null); }
  }

  const family = query.data?.family;
  const documents = (query.data?.documents ?? []) as DocRow[];
  const contacts = query.data?.contacts ?? [];

  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All families
        </Link>

        {query.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

        {family && (
          <>
            <h1 className="heading-display mt-4 text-3xl text-primary">{family.family_name}</h1>
            <div className="mt-2 flex flex-wrap gap-4">
              <Link
                to="/admin/hub/$id"
                params={{ id }}
                className="inline-block text-sm text-primary underline underline-offset-4"
              >
                View what this family has filled in
              </Link>
              <Link
                to="/admin/agreement/$id"
                params={{ id }}
                className="inline-block text-sm text-primary underline underline-offset-4"
              >
                Edit nanny agreement &amp; signatures
              </Link>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-foreground">Vault link &amp; access code</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <code className="rounded bg-muted px-2 py-1">/w/{family.slug}</code>
                <code className="rounded bg-muted px-2 py-1">Code {family.access_code}</code>
                <button
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/w/${family.slug} — access code ${family.access_code}`,
                    );
                    toast.success("Link and code copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  onClick={async () => {
                    await regenFn({ data: { id } });
                    await refresh();
                    toast.success("New code created");
                  }}
                >
                  New code
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-foreground">Documents</p>
              <div className="mt-4 space-y-4">
                {DOC_TYPES.map((doc) => {
                  const existing = documents.find((d) => d.doc_type === doc.key);
                  return (
                    <div key={doc.key}>
                      <Label className="text-sm">{doc.label}</Label>
                      {existing ? (
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                          <button
                            className="text-primary underline underline-offset-4"
                            onClick={async () => {
                              const { url } = await docUrlFn({
                                data: { storagePath: existing.storage_path },
                              });
                              if (url) window.open(url, "_blank", "noopener");
                            }}
                          >
                            {existing.file_name}
                          </button>
                          <button
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              await deleteFn({ data: { id: existing.id } });
                              await refresh();
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">Not uploaded yet</p>
                      )}
                      <Input
                        type="file"
                        accept={doc.accept}
                        disabled={uploading === doc.key}
                        className="mt-2"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void onUpload(doc.key, file);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  );
                })}
                <div>
                  <Label className="text-sm">Nanny photo (shown in the vault)</Label>
                  {family.nanny_photo_path ? (
                    <p className="mt-1 text-sm text-muted-foreground">Photo set — upload again to replace</p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Not uploaded yet</p>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploading === "nanny_photo"}
                    className="mt-2"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onPhotoUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>

            <form className="mt-4 rounded-xl border border-border bg-card p-5" onSubmit={async (event) => { event.preventDefault(); await saveServicesFn({ data: { familyId: id, ...services } }); toast.success("Concierge status saved"); await refresh(); }}>
              <p className="text-sm font-medium text-foreground">Family concierge status</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label>Payroll setup</Label><Select value={services.payrollStatus} onValueChange={(value) => setServices({ ...services, payrollStatus: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{PAYROLL_STATUSES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label>Payroll start date</Label><Input className="mt-1" type="date" value={services.payrollStartDate} onChange={(event) => setServices({ ...services, payrollStartDate: event.target.value })} /></div></div>
              <Label className="mt-4 block">Family-facing payroll update</Label><Textarea className="mt-1" value={services.payrollNotes} onChange={(event) => setServices({ ...services, payrollNotes: event.target.value })} />
              <Label className="mt-4 block">Private curation</Label><Select value={services.curationStatus} onValueChange={(value) => setServices({ ...services, curationStatus: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CURATION_STATUSES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
              <Label className="mt-4 block">Family-facing search update</Label><Textarea className="mt-1" value={services.curationNotes} onChange={(event) => setServices({ ...services, curationNotes: event.target.value })} />
              <Button className="mt-4" type="submit">Save concierge status</Button>
            </form>

            {(query.data?.nannies ?? []).map((nanny) => <NannySafetyAdmin key={nanny.id} familyId={id} nanny={nanny} documents={query.data?.safetyDocuments ?? []} uploading={uploading} onUpload={onSafetyUpload} saveInsurance={async (values) => { await saveInsuranceFn({ data: { familyId: id, nannyId: nanny.id, ...values } }); toast.success("Insurance record saved"); await refresh(); }} />)}

            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-foreground">Checks &amp; credentials</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose what families see: the document itself, a "verified" badge only, or nothing.
              </p>
              <div className="mt-4 space-y-5">
                {CHECK_DOCS.map((doc) => {
                  const existing = documents.find((d) => d.doc_type === doc.key);
                  return (
                    <div key={doc.key} className="border-t border-border pt-4 first:border-0 first:pt-0">
                      <Label className="text-sm">{doc.label}</Label>
                      {existing ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <button
                              className="text-primary underline underline-offset-4"
                              onClick={async () => {
                                const { url } = await docUrlFn({
                                  data: { storagePath: existing.storage_path },
                                });
                                if (url) window.open(url, "_blank", "noopener");
                              }}
                            >
                              {existing.file_name}
                            </button>
                            <button
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
                              onClick={async () => {
                                await deleteFn({ data: { id: existing.id } });
                                await refresh();
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <Select
                              value={existing.visibility}
                              onValueChange={async (value) => {
                                await metaFn({
                                  data: {
                                    id: existing.id,
                                    visibility: value,
                                    issuedOn: existing.issued_on ?? "",
                                    referenceLabel: existing.reference_label ?? "",
                                  },
                                });
                                await refresh();
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="document">Show document</SelectItem>
                                <SelectItem value="badge">Verified badge only</SelectItem>
                                <SelectItem value="hidden">Hidden</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="date"
                              defaultValue={existing.issued_on ?? ""}
                              onBlur={async (e) => {
                                await metaFn({
                                  data: {
                                    id: existing.id,
                                    visibility: existing.visibility,
                                    issuedOn: e.target.value,
                                    referenceLabel: existing.reference_label ?? "",
                                  },
                                });
                                await refresh();
                              }}
                            />
                            <Input
                              placeholder="Ref / cert number"
                              defaultValue={existing.reference_label ?? ""}
                              onBlur={async (e) => {
                                await metaFn({
                                  data: {
                                    id: existing.id,
                                    visibility: existing.visibility,
                                    issuedOn: existing.issued_on ?? "",
                                    referenceLabel: e.target.value,
                                  },
                                });
                                await refresh();
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">Not uploaded yet</p>
                      )}
                      <Input
                        type="file"
                        accept="application/pdf,image/*"
                        disabled={uploading === doc.key}
                        className="mt-2"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void onUpload(doc.key, file);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-foreground">Family emergency contacts</p>
              <div className="mt-3 space-y-2">
                {contacts.length === 0 && (
                  <p className="text-sm text-muted-foreground">None added yet (up to 3).</p>
                )}
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">
                      {c.name}
                      {c.relationship ? ` (${c.relationship})` : ""} — {c.phone}
                    </span>
                    <button
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        await deleteContactFn({ data: { id: c.id } });
                        await refresh();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                ))}
              </div>
              {contacts.length < 3 && (
                <form
                  className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await addContactFn({ data: { familyId: id, ...contact } });
                      setContact({ name: "", relationship: "", phone: "" });
                      await refresh();
                      toast.success("Contact added");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not add contact");
                    }
                  }}
                >
                  <Input
                    placeholder="Name"
                    value={contact.name}
                    onChange={(e) => setContact({ ...contact, name: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Relationship"
                    value={contact.relationship}
                    onChange={(e) => setContact({ ...contact, relationship: e.target.value })}
                  />
                  <Input
                    placeholder="Phone"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    required
                  />
                  <Button type="submit" variant="outline">
                    Add
                  </Button>
                </form>
              )}
            </div>

            <form onSubmit={onSave} className="mt-4 space-y-4 rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-foreground">Family details</p>
              <div>
                <Label htmlFor="name">Family name</Label>
                <Input
                  id="name"
                  className="mt-1"
                  value={form.familyName}
                  onChange={(e) => setForm({ ...form, familyName: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Contact email</Label>
                  <Input
                    id="email"
                    className="mt-1"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Contact phone</Label>
                  <Input
                    id="phone"
                    className="mt-1"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Membership</Label>
                <Select
                  value={form.tierBand}
                  onValueChange={(value) => setForm({ ...form, tierBand: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_BANDS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.days} — {t.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="nanny">Nanny name</Label>
                  <Input
                    id="nanny"
                    className="mt-1"
                    value={form.nannyName}
                    onChange={(e) => setForm({ ...form, nannyName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="start">Start date</Label>
                  <Input
                    id="start"
                    type="date"
                    className="mt-1"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="nbio">Nanny bio (shown in the vault)</Label>
                <Textarea
                  id="nbio"
                  className="mt-1"
                  placeholder="A sentence or two about the nanny…"
                  value={form.nannyBio}
                  onChange={(e) => setForm({ ...form, nannyBio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="nannytax">Nannytax referral code</Label>
                <Input
                  id="nannytax"
                  className="mt-1"
                  placeholder="e.g. AM12345"
                  value={form.nannytaxCode}
                  onChange={(e) => setForm({ ...form, nannytaxCode: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Shown in this family's vault with a link to nannytax.co.uk.
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Nanny's emergency contact</Label>
                <div className="mt-1 grid gap-2 sm:grid-cols-3">
                  <Input
                    placeholder="Name"
                    value={form.nannyEmergencyName}
                    onChange={(e) => setForm({ ...form, nannyEmergencyName: e.target.value })}
                  />
                  <Input
                    placeholder="Relationship"
                    value={form.nannyEmergencyRelationship}
                    onChange={(e) =>
                      setForm({ ...form, nannyEmergencyRelationship: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Phone"
                    value={form.nannyEmergencyPhone}
                    onChange={(e) => setForm({ ...form, nannyEmergencyPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="terms">Terms accepted on</Label>
                  <Input
                    id="terms"
                    type="date"
                    className="mt-1"
                    value={form.termsAcceptedOn}
                    onChange={(e) => setForm({ ...form, termsAcceptedOn: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm({ ...form, status: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (paying member)</SelectItem>
                      <SelectItem value="cancelled">Cancelled (vault locked)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="homeAddress">Home address</Label>
                <Textarea
                  id="homeAddress"
                  className="mt-1"
                  rows={3}
                  placeholder="House number, street, town, postcode"
                  value={form.homeAddress}
                  onChange={(e) => setForm({ ...form, homeAddress: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">Also shows on the family's emergency card.</p>
              </div>
              <div>
                <Label htmlFor="notes">Private notes</Label>
                <Textarea
                  id="notes"
                  className="mt-1"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button type="submit">Save changes</Button>
            </form>
            <div className="mt-8 rounded-xl border border-destructive/40 bg-card p-5">
              <p className="font-medium text-foreground">Delete this family</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently removes the vault and everything in it (documents, agreements, logs). This cannot be undone. To keep their records, set them to Cancelled instead.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="mt-3"
                onClick={async () => {
                  const name = query.data?.family.family_name ?? "";
                  const typed = window.prompt(`Type the family name to confirm deleting:\n${name}`);
                  if (typed === null) return;
                  if (typed.trim().toLowerCase() !== name.trim().toLowerCase()) {
                    toast.error("Name didn't match — nothing was deleted");
                    return;
                  }
                  try {
                    await deleteFamilyFn({ data: { id } });
                    await queryClient.invalidateQueries({ queryKey: ["families"] });
                    toast.success("Family deleted");
                    navigate({ to: "/admin" });
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not delete");
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete family
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NannySafetyAdmin({ nanny, documents, uploading, onUpload, saveInsurance }: { familyId: string; nanny: { id: string; name: string; insurance_provider: string | null; insurance_policy_number: string | null; insurance_cover_from: string | null; insurance_cover_until: string | null }; documents: { nanny_id: string; document_type: string; file_name: string }[]; uploading: string | null; onUpload: (nannyId: string, type: string, file: File) => Promise<void>; saveInsurance: (values: { provider: string; policyNumber: string; coverFrom: string; coverUntil: string }) => Promise<void> }) {
  const [values, setValues] = useState({ provider: nanny.insurance_provider ?? "", policyNumber: nanny.insurance_policy_number ?? "", coverFrom: nanny.insurance_cover_from ?? "", coverUntil: nanny.insurance_cover_until ?? "" });
  return <form className="mt-4 rounded-xl border border-border bg-card p-5" onSubmit={async (event) => { event.preventDefault(); await saveInsurance(values); }}><p className="text-sm font-medium text-foreground">{nanny.name} — insurance &amp; safeguarding</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input placeholder="Insurance provider" value={values.provider} onChange={(event) => setValues({ ...values, provider: event.target.value })} /><Input placeholder="Policy/reference" value={values.policyNumber} onChange={(event) => setValues({ ...values, policyNumber: event.target.value })} /><div><Label>Cover from</Label><Input className="mt-1" type="date" value={values.coverFrom} onChange={(event) => setValues({ ...values, coverFrom: event.target.value })} /></div><div><Label>Cover until</Label><Input className="mt-1" type="date" value={values.coverUntil} onChange={(event) => setValues({ ...values, coverUntil: event.target.value })} /></div></div><Button className="mt-3" size="sm" type="submit">Save insurance</Button><div className="mt-5 grid gap-3 sm:grid-cols-2">{SAFETY_DOCUMENTS.map(([type, label]) => { const document = documents.find((item) => item.nanny_id === nanny.id && item.document_type === type); const key = `${nanny.id}-${type}`; return <div key={type}><Label>{label}</Label><p className="mt-1 text-xs text-muted-foreground">{document?.file_name ?? "Not recorded"}</p><Input className="mt-2" type="file" accept="application/pdf,image/*" disabled={uploading === key} onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(nanny.id, type, file); event.target.value = ""; }} /></div>; })}</div></form>;
}
