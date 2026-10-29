import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Printer } from "lucide-react";

import { getSignatures, signDocumentFn } from "@/lib/agreement.functions";
import { TermsContent } from "@/components/TermsContent";
import { HubPage, LockedNotice, Card } from "@/components/hub-ui";
import { SignForm, SignatureList } from "@/components/SignBlock";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms/$slug")({
  head: () => ({
    meta: [
      { title: "Membership terms — The Family Wallet" },
      {
        name: "description",
        content:
          "Read and sign your agency membership terms and conditions inside your Family Wallet.",
      },
      { property: "og:title", content: "Membership terms — The Family Wallet" },
      {
        property: "og:description",
        content: "Read and sign your membership terms inside your Family Wallet.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getSignatures);
  const signFn = useServerFn(signDocumentFn);

  const query = useQuery({
    queryKey: ["signatures", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading your terms…
      </div>
    );
  }

  const data = query.data;
  if (!data) return <LockedNotice slug={slug} />;

  async function onSign(name: string, role: "parent" | "nanny") {
    const result = await signFn({
      data: { slug, docKind: "terms" as const, signerRole: role, signerName: name },
    });
    if (result.ok) {
      toast.success("Terms signed and saved to your wallet.");
      await queryClient.invalidateQueries({ queryKey: ["signatures", slug] });
      await queryClient.invalidateQueries({ queryKey: ["wallet", slug] });
    } else if (result.reason === "name") {
      toast.error("Please type your full name.");
    } else {
      toast.error("Something went wrong. Please try again.");
    }
  }

  const signatures = data.signatures.filter((s) => s.docKind === "terms");

  return (
    <HubPage
      slug={slug}
      title="Membership terms & conditions"
      intro="Read them here and sign them here — your signed copy stays in your wallet."
    >
      <div className="space-y-6">
        <Card>
          <h2 className="heading-display text-lg text-foreground">Your signature</h2>
          <div className="mt-3">
            <SignatureList signatures={signatures} />
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <SignForm
              role="parent"
              statement={`I have read and agree to your agency membership terms and conditions (version ${data.termsVersion}).`}
              onSign={onSign}
            />
          </div>
        </Card>

        <Card>
          <div className="print-area">
            <TermsContent />
          </div>
        </Card>

        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print or save as PDF
        </Button>
      </div>
    </HubPage>
  );
}
