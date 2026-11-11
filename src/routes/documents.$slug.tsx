import { formatDate } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { FileText, Lock, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Card, Field, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { deleteDocumentFn, documentLinkFn, listDocumentsFn, uploadDocumentFn } from "@/lib/documents.functions";
import {
  ALLOWED_DOCUMENT_TYPES,
  categoryLabel,
  DOCUMENT_CATEGORIES,
  expiryState,
  MAX_DOCUMENT_BYTES,
  type VaultDocument,
} from "@/lib/documents.types";

export const Route = createFileRoute("/documents/$slug")({
  head: () => ({
    meta: [
      { title: "Documents — Family Wallet" },
      { name: "description", content: "A private place for DBS checks, ID, passports, right to work and other key documents." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocumentsPage,
});

const readBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });

const fmtDate = (iso: string) => formatDate(iso, { day: "numeric", month: "short", year: "numeric" });
const fmtSize = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function DocumentsPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const listFn = useServerFn(listDocumentsFn);
  const uploadFn = useServerFn(uploadDocumentFn);
  const deleteFn = useServerFn(deleteDocumentFn);
  const linkFn = useServerFn(documentLinkFn);
  const query = useQuery({ queryKey: ["documents", slug], queryFn: () => listFn({ data: { slug } }) });

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ownerId, setOwnerId] = useState<string>("");
  const [category, setCategory] = useState<string>("dbs");
  const [title, setTitle] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);

  if (query.isLoading) return <PageLoading />;
  if (!query.data) return <LockedNotice slug={slug} />;
  const data = query.data;
  const isFamily = data.access === "family";
  const owner = ownerId || (data.people[0]?.id ?? "");
  const cat = DOCUMENT_CATEGORIES.find((c) => c.value === category);
  const toHousehold = isFamily && !owner;

  const submit = async () => {
    if (!file) {
      toast.error("Choose a file first.");
      return;
    }
    if (!ALLOWED_DOCUMENT_TYPES[file.type]) {
      toast.error("Please upload a PDF, JPG, PNG or WebP file.");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error("Files must be under 10MB.");
      return;
    }
    setBusy(true);
    try {
      await uploadFn({
        data: {
          slug,
          doc: {
            ownerId: owner || null,
            category,
            title,
            issuedOn,
            expiresOn: cat?.expires ? expiresOn : "",
            sharedWithStaff: toHousehold && shared,
            fileName: file.name,
            contentType: file.type,
            base64: await readBase64(file),
          },
        },
      });
      await client.invalidateQueries({ queryKey: ["documents", slug] });
      toast.success("Document saved");
      setFile(null);
      setTitle("");
      setIssuedOn("");
      setExpiresOn("");
      setShared(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that document");
    } finally {
      setBusy(false);
    }
  };

  const open = async (doc: VaultDocument) => {
    try {
      const { url } = await linkFn({ data: { slug, id: doc.id } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open that document");
    }
  };

  const remove = async (doc: VaultDocument) => {
    if (!window.confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    try {
      await deleteFn({ data: { slug, id: doc.id } });
      await client.invalidateQueries({ queryKey: ["documents", slug] });
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete that");
    }
  };

  // One group per person, the household first.
  const groups = [...new Set(data.documents.map((d) => d.ownerId ?? ""))].sort((a, b) => (a === "" ? -1 : b === "" ? 1 : 0));

  return (
    <HubPage
      slug={slug}
      title="Documents"
      intro="A private place for key documents: DBS checks, ID, passports, right to work and anything else you both need to keep safe."
    >
      <div data-tint="sky" className="tint-card flex items-start gap-3 rounded-2xl px-4 py-3 text-sm text-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Files are stored privately, never public, and open only through short-lived links after we check who is asking.{" "}
          {isFamily
            ? "Staff see only their own documents and any household document you choose to share."
            : "You see your own documents and any the household has shared with you. Parents can see the documents you add."}
        </p>
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="heading-display text-lg text-foreground">Add a document</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.people.length > 1 && (
              <label className="block">
                <span className="text-sm font-medium text-foreground">Whose document</span>
                <select
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={owner}
                  onChange={(e) => setOwnerId(e.target.value)}
                >
                  {data.people.map((p) => (
                    <option key={p.id ?? "household"} value={p.id ?? ""}>
                      {p.household ? `${p.name} (household)` : p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="text-sm font-medium text-foreground">Type</span>
              <select
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {cat && <span className="mt-1 block text-xs text-muted-foreground">{cat.hint}</span>}
            </label>
            <Field label="Name (optional)" value={title} placeholder={cat?.label ?? ""} onChange={setTitle} />
            <Field label="Issued on (optional)" type="date" value={issuedOn} onChange={setIssuedOn} />
            {cat?.expires && <Field label="Expires on (optional)" type="date" value={expiresOn} onChange={setExpiresOn} />}
          </div>
          {toHousehold && (
            <label className="mt-4 flex items-start gap-3 text-sm text-foreground">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={shared} onChange={(e) => setShared(e.target.checked)} />
              <span>Share with our household staff (for example, so your nanny can see your ID)</span>
            </label>
          )}
          <label className="mt-4 block">
            <span className="text-sm font-medium text-foreground">File</span>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="mt-1.5 block w-full text-sm text-muted-foreground"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="mt-1 block text-xs text-muted-foreground">PDF, JPG, PNG or WebP, up to 10MB.</span>
          </label>
          <Button className="mt-4" disabled={busy || !file} onClick={submit}>
            <Upload className="h-4 w-4" /> {busy ? "Saving…" : "Save document"}
          </Button>
        </Card>
      </div>

      {data.documents.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No documents yet. Add the first one above.</p>
      ) : (
        groups.map((g) => {
          const docs = data.documents.filter((d) => (d.ownerId ?? "") === g);
          return (
            <section key={g || "household"} className="mt-8">
              <h2 className="heading-display text-xl text-foreground">
                {docs[0]!.ownerId ? docs[0]!.ownerName : `${docs[0]!.ownerName} (household)`}
              </h2>
              <div className="mt-3 space-y-3">
                {docs.map((doc) => {
                  const expiry = expiryState(doc.expiresOn);
                  return (
                    <Card key={doc.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{doc.title}</p>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {categoryLabel(doc.category)} · {fmtSize(doc.sizeBytes)} · added {fmtDate(doc.createdAt)} by{" "}
                              {doc.uploadedBy === "family" ? "a parent" : doc.ownerName}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {expiry.state === "expired" && (
                                <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">Expired</span>
                              )}
                              {expiry.state === "soon" && (
                                <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
                                  Expires in {expiry.days} day{expiry.days === 1 ? "" : "s"}
                                </span>
                              )}
                              {expiry.state === "ok" && doc.expiresOn && (
                                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground">Expires {fmtDate(doc.expiresOn)}</span>
                              )}
                              {isFamily && !doc.ownerId && doc.sharedWithStaff && (
                                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground">Shared with staff</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => open(doc)}>
                            View
                          </Button>
                          {doc.canDelete && (
                            <Button size="icon" variant="ghost" aria-label={`Delete ${doc.title}`} onClick={() => remove(doc)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </HubPage>
  );
}
