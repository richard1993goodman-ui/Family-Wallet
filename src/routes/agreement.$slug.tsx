import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Printer } from "lucide-react";

import { getAgreement, signDocumentFn } from "@/lib/agreement.functions";
import { AgreementDocument } from "@/components/AgreementDocument";
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
          "Read and sign your full nanny employment contract inside your family wallet — no printing, no email attachments.",
      },
      { property: "og:title", content: "Your nanny agreement — Athlete Mannies & Nannies" },
      {
        property: "og:description",
        content: "Read and sign your nanny employment contract inside your family wallet.",
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

  const query = useQuery({
    queryKey: ["agreement", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading your agreement…
      </div>
    );
  }

  const data = query.data;
  if (!data) return <LockedNotice slug={slug} />;

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
      toast.error("This agreement hasn't been issued yet.");
    } else {
      toast.error("Something went wrong. Please try again.");
    }
  }

  const signatures = data.signatures.filter((s) => s.docKind === "agreement");

  return (
    <HubPage
      slug={slug}
      title="Your nanny agreement"
      intro="Read it here, sign it here. Your signed copy stays in your wallet."
    >
      {!data.hasContent ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Your agreement is being prepared. It will appear here as soon as we've issued it.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
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
              />
              <div className="border-t border-border pt-5">
                <SignForm
                  role="nanny"
                  statement="I am the nanny or manny named above and I agree to this agreement."
                  onSign={onSign}
                />
              </div>
            </div>
          </Card>

          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print or save as PDF
          </Button>
        </div>
      )}
    </HubPage>
  );
}
