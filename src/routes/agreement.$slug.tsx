import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Printer } from "lucide-react";

import { getAgreement, saveAgreementFn, signDocumentFn } from "@/lib/agreement.functions";
import type { AgreementData } from "@/lib/agreement.model";
import { AgreementDocument } from "@/components/AgreementDocument";
import { AgreementBuilder } from "@/components/AgreementBuilder";
import { HubPage, LockedNotice, Card } from "@/components/hub-ui";
import { SignForm, SignatureList } from "@/components/SignBlock";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/agreement/$slug")({
  head: () => ({
    meta: [
      { title: "Your nanny agreement — Athlete Mannies & Nannies" },
      {
        name: "description",
        content:
          "Build, read and sign your full nanny employment contract inside your family wallet — no printing, no email attachments.",
      },
      { property: "og:title", content: "Your nanny agreement — Athlete Mannies & Nannies" },
      {
        property: "og:description",
        content: "Build, read and sign your nanny employment contract inside your family wallet.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgreementPage,
});

function AgreementPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getAgreement);
  const signFn = useServerFn(signDocumentFn);
  const saveFn = useServerFn(saveAgreementFn);

  const query = useQuery({
    queryKey: ["agreement", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });

  const [draft, setDraft] = useState<AgreementData | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const data = query.data;

  useEffect(() => {
    if (!data) return;
    setDraft(data.data);
    // Nothing written yet — open the builder straight away.
    if (!data.hasContent) setEditing(true);
  }, [data]);

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading your agreement…
      </div>
    );
  }

  if (!data) return <LockedNotice slug={slug} />;

  async function save(publish: boolean) {
    if (!draft) return;
    setBusy(true);
    try {
      const result = await saveFn({ data: { slug, data: draft, publish } });
      if (!result.ok) {
        toast.error("Please unlock your wallet again.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["agreement", slug] });
      toast.success(publish ? "Agreement ready to sign." : "Saved.");
      if (publish) setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function onSign(name: string, role: "parent" | "nanny") {
    const result = await signFn({
      data: { slug, docKind: "agreement" as const, signerRole: role, signerName: name },
    });
    if (result.ok) {
      toast.success("Signed and saved to your wallet.");
      await queryClient.invalidateQueries({ queryKey: ["agreement", slug] });
    } else if (result.reason === "name") {
      toast.error("Please type your full name.");
    } else if (result.reason === "not_ready") {
      toast.error("Mark the agreement as ready to sign first.");
    } else {
      toast.error("Something went wrong. Please try again.");
    }
  }

  const signatures = data.signatures.filter((s) => s.docKind === "agreement");
  const issued = data.status === "issued";

  if (editing && draft) {
    return (
      <HubPage
        slug={slug}
        title="Your nanny agreement"
        intro="Fill this in together with your nanny. You can save and come back at any time."
      >
        <div className="space-y-5">
          <AgreementBuilder data={draft} onChange={setDraft} />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" disabled={busy} onClick={() => save(false)}>
              Save and finish later
            </Button>
            <Button disabled={busy} onClick={() => save(true)}>
              {issued ? "Save and re-issue for signing" : "Done — ready to sign"}
            </Button>
            {data.hasContent && (
              <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
          {issued && (
            <p className="text-xs text-muted-foreground">
              Re-issuing creates a new version, so parent and nanny will need to sign again.
            </p>
          )}
        </div>
      </HubPage>
    );
  }

  return (
    <HubPage
      slug={slug}
      title="Your nanny agreement"
      intro="Read it here, sign it here. Your signed copy stays in your wallet."
    >
      <div className="space-y-6">
        {!issued && (
          <Card>
            <p className="text-sm text-muted-foreground">
              This is still a draft. When you and your nanny are happy with it, open the editor and
              choose <span className="font-medium text-foreground">Done — ready to sign</span>.
            </p>
          </Card>
        )}

        <div className="print-area space-y-6">
          <AgreementDocument
            data={data.data}
            version={data.version}
            issuedAt={data.issuedAt}
            familyName={data.familyName}
          />

          <Card>
            <h2 className="heading-display text-lg text-foreground">Signatures</h2>
            <div className="mt-3">
              <SignatureList signatures={signatures} />
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="heading-display text-lg text-foreground">Sign this agreement</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Typing your name below counts as your signature. We record your name, the date and
            time, and the version you signed.
          </p>
          <div className="mt-4 space-y-6">
            <SignForm
              role="parent"
              statement="I am the parent or employer and I agree to this nanny agreement."
              onSign={onSign}
              disabled={!issued}
            />
            <div className="border-t border-border pt-5">
              <SignForm
                role="nanny"
                statement="I am the nanny or manny named above and I agree to this agreement."
                onSign={onSign}
                disabled={!issued}
              />
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit agreement
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print or save as PDF
          </Button>
        </div>
      </div>
    </HubPage>
  );
}
