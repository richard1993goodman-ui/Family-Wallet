import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Award } from "lucide-react";

import { getCertificate } from "@/lib/training.functions";
import { BackToWallet } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/certificate/$slug/$id")({
  head: () => ({
    meta: [
      { title: "Training Certificate — Family Wallet" },
      {
        name: "description",
        content:
          "A completion certificate for the after-school nanny training, stored in your Family Wallet.",
      },
      { property: "og:title", content: "Training Certificate — Family Wallet" },
      {
        property: "og:description",
        content: "Proof of completed after-school nanny training.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CertificatePage,
});

function CertificatePage() {
  const { slug, id } = Route.useParams();
  const loadFn = useServerFn(getCertificate);

  const query = useQuery({
    queryKey: ["certificate", slug, id],
    queryFn: () => loadFn({ data: { slug, id } }),
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand px-5 text-center">
        <div className="max-w-sm">
          <h1 className="heading-display text-2xl text-primary">Certificate not available</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Unlock your wallet first, or complete the training to earn a certificate.
          </p>
          <Link
            to="/training/$slug"
            params={{ slug }}
            className="mt-4 inline-block text-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
          >
            Go to the training hub
          </Link>
        </div>
      </div>
    );
  }

  const cert = query.data;

  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to="/training/$slug"
            params={{ slug }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to training
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            Print or save as PDF
          </Button>
        </div>

        <div className="mt-6 rounded-xl border-2 border-primary/30 bg-card p-9 text-center">
          <Award className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-4 text-[0.8125rem] font-medium text-muted-foreground">
            Family Wallet
          </p>
          <h1 className="heading-display mt-3 text-3xl text-primary">Certificate of completion</h1>
          <p className="mt-6 text-sm text-muted-foreground">This certifies that</p>
          <p className="heading-display mt-1 text-2xl text-foreground">{cert.learner_name}</p>
          <p className="mt-5 text-sm text-muted-foreground">
            has successfully completed the After-School Nanny Training — covering the daily routine,
            safeguarding children, emergencies and first aid, food and wellbeing, and professional
            conduct.
          </p>
          <p className="mt-5 text-sm font-medium text-foreground">
            Score: {cert.score} out of {cert.total}
          </p>
          <div className="mt-7 border-t border-border pt-5 text-xs text-muted-foreground">
            <p>
              Awarded{" "}
              {new Date(cert.completed_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · Family: {cert.familyName}
            </p>
            <p className="mt-1">Certificate reference {cert.certificate_ref}</p>
          </div>
        </div>
        <BackToWallet slug={slug} />
      </div>
    </div>
  );
}
