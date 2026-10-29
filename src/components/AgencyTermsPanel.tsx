import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileUp, ScrollText, Trash2 } from "lucide-react";

import { deleteMyAgencyTerms, getMyAgencyTerms, uploadMyAgencyTerms } from "@/lib/agency-terms.functions";
import { Button } from "@/components/ui/button";

async function toBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function AgencyTermsPanel() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyAgencyTerms);
  const upFn = useServerFn(uploadMyAgencyTerms);
  const delFn = useServerFn(deleteMyAgencyTerms);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["agency-terms"], queryFn: () => getFn() });

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Please choose a PDF file.");
    setBusy(true);
    try {
      await upFn({ data: { fileName: file.name, contentType: file.type, base64: await toBase64(file) } });
      toast.success("Terms uploaded — families will be asked to sign the new version.");
      await qc.invalidateQueries({ queryKey: ["agency-terms"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const t = q.data;
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-primary" />
        <h2 className="heading-display text-lg text-foreground">Your terms &amp; conditions</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload your agency's own terms as a PDF. Every family you run will see them in their wallet and can sign them there.
      </p>
      <div className="mt-4 rounded-xl border border-border p-3 text-sm">
        {q.isLoading ? "Loading…" : t ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-medium text-foreground">{t.fileName}</span>
              <span className="text-muted-foreground"> · version {t.version} · {new Date(t.uploadedAt).toLocaleDateString("en-GB")}</span>
            </span>
            <span className="flex gap-2">
              {t.url && <Button asChild size="sm" variant="outline"><a href={t.url} target="_blank" rel="noopener noreferrer">View</a></Button>}
              <Button size="sm" variant="outline" disabled={busy} onClick={async () => { if (!confirm("Remove your terms? Families will no longer see them.")) return; await delFn(); await qc.invalidateQueries({ queryKey: ["agency-terms"] }); toast.success("Terms removed"); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </div>
        ) : <span className="text-muted-foreground">No terms uploaded yet — families won't see a terms page until you add one.</span>}
      </div>
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <Button className="mt-3" disabled={busy} onClick={() => input.current?.click()}>
        <FileUp className="h-4 w-4" /> {busy ? "Uploading…" : t ? "Upload a new version" : "Upload terms (PDF)"}
      </Button>
    </section>
  );
}
