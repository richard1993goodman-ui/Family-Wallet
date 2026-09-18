import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";

import {
  deleteDocument,
  getAdminDocumentUrl,
  getFamily,
  regenerateCode,
  saveFamily,
  uploadDocument,
} from "@/lib/admin.functions";
import { TIER_BANDS } from "@/lib/tiers";
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
      { title: "Family details — Athlete Mannies Family Wallet" },
      { name: "description", content: "Edit a family's wallet, documents and membership." },
      { property: "og:title", content: "Family details — Athlete Mannies Family Wallet" },
      { property: "og:description", content: "Edit a family's wallet, documents and membership." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FamilyDetail,
});

const DOC_TYPES = [
  { key: "agreement", label: "Nanny agreement (PDF)", accept: "application/pdf" },
  { key: "cv", label: "Nanny CV (PDF)", accept: "application/pdf" },
  { key: "nanny_photo", label: "Nanny photo (optional)", accept: "image/*" },
];

function FamilyDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const getFamilyFn = useServerFn(getFamily);
  const saveFn = useServerFn(saveFamily);
  const regenFn = useServerFn(regenerateCode);
  const uploadFn = useServerFn(uploadDocument);
  const deleteFn = useServerFn(deleteDocument);
  const docUrlFn = useServerFn(getAdminDocumentUrl);

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
    startDate: "",
    termsAcceptedOn: "",
    notes: "",
    status: "active",
  });
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    const f = query.data?.family;
    if (!f) return;
    setForm({
      familyName: f.family_name ?? "",
      contactEmail: f.contact_email ?? "",
      contactPhone: f.contact_phone ?? "",
      tierBand: f.tier_band ?? "3",
      nannyName: f.nanny_name ?? "",
      startDate: f.start_date ?? "",
      termsAcceptedOn: f.terms_accepted_on ?? "",
      notes: f.notes ?? "",
      status: f.status ?? "active",
    });
  }, [query.data?.family]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveFn({ data: { id, ...form } });
      toast.success("Saved");
      await queryClient.invalidateQueries({ queryKey: ["family", id] });
      await queryClient.invalidateQueries({ queryKey: ["families"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  async function onUpload(docType: string, file: File) {
    setUploading(docType);
    try {
      const buffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      await uploadFn({
        data: {
          familyId: id,
          docType,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          base64: btoa(binary),
        },
      });
      toast.success("Uploaded");
      await queryClient.invalidateQueries({ queryKey: ["family", id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  const family = query.data?.family;
  const documents = query.data?.documents ?? [];

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

            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-foreground">Wallet link &amp; access code</p>
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
                    await queryClient.invalidateQueries({ queryKey: ["family", id] });
                    await queryClient.invalidateQueries({ queryKey: ["families"] });
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
                              await queryClient.invalidateQueries({ queryKey: ["family", id] });
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
              </div>
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
          </>
        )}
      </div>
    </div>
  );
}
