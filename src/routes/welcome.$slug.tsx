import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Card, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { First48Checklist } from "@/components/First48Checklist";
import { finishWelcomeFn, getWelcome, getFirst48, setWelcomeStepFn } from "@/lib/welcome.functions";

const welcomeOptions = (slug: string) => queryOptions({ queryKey: ["welcome", slug], queryFn: () => getWelcome({ data: { slug } }) });
const first48Options = (slug: string) => queryOptions({ queryKey: ["first48", slug], queryFn: () => getFirst48({ data: { slug } }) });

export const Route = createFileRoute("/welcome/$slug")({
  loader: async ({ context, params }) => { await Promise.all([context.queryClient.ensureQueryData(welcomeOptions(params.slug)), context.queryClient.ensureQueryData(first48Options(params.slug))]); },
  head: () => ({
    meta: [
      { title: "First 48 hours — Family Vault | Athlete Mannies & Nannies" },
      {
        name: "description",
        content: "A shared parent and nanny checklist for a confident first two days, with confirmations, routines and settling-in notes.",
      },
      { property: "og:title", content: "First 48 hours — Family Vault" },
      {
        property: "og:description",
        content: "Agree the essentials together, from school collection and safety to your first handover.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const stepFn = useServerFn(setWelcomeStepFn);
  const finishFn = useServerFn(finishWelcomeFn);
  const [busy, setBusy] = useState(false);

  const query = useSuspenseQuery(welcomeOptions(slug));
  const first48 = useSuspenseQuery(first48Options(slug));
  if (!query.data || !first48.data) return <LockedNotice slug={slug} />;

  const data = query.data;
  const isFamily = data.access === "family";
  const refresh = () => client.invalidateQueries({ queryKey: ["welcome", slug] });

  const toggleStep = async (stepId: (typeof data.steps)[number]["id"], done: boolean) => {
    setBusy(true);
    try {
      await stepFn({ data: { slug, stepId, done } });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      await finishFn({ data: { slug } });
      await refresh();
      toast.success("Setup finished — enjoy your vault!");
    } finally {
      setBusy(false);
    }
  };

  const pct = Math.round((data.doneCount / data.total) * 100);

  return (
    <HubPage
      slug={slug}
      title="First 48 hours"
      intro="A confident start for your family and nanny. Clear routines, shared expectations and a little time to talk."
    >
      <First48Checklist slug={slug} data={first48.data} />
      <details className="mt-8 border-t border-border pt-5">
      <summary className="cursor-pointer font-semibold text-foreground">Family Vault setup · {data.doneCount} of {data.total} done</summary>
      <div className="mt-4">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="heading-display text-2xl text-primary">
              {data.completed ? "You're all set" : `${data.doneCount} of ${data.total} done`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.completed
                ? "Your vault is fully set up — everything below stays here whenever you need it."
                : "Keep going — each tick makes the vault more useful for everyone."}
            </p>
          </div>
          <Sparkles className="h-8 w-8 flex-shrink-0 text-primary" />
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      <div className="mt-4 space-y-3">
        {data.steps.map((step, index) => (
          <Card key={step.id}>
            <div className="flex items-start gap-4">
              <div
                className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                  step.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{step.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    to={step.href}
                    params={{ slug }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                      step.done
                        ? "border border-border text-foreground hover:bg-muted"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {step.done ? "Revisit" : "Do this now"}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  {isFamily && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => toggleStep(step.id, !step.manual)}
                    >
                      {step.manual ? "Un-tick" : "Mark as done"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isFamily && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">All done early?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tidy the journey away now — you can always come back from your vault home.
              </p>
            </div>
            <Button variant="outline" disabled={busy} onClick={finish}>
              <Camera className="h-4 w-4" /> Finish setup
            </Button>
          </div>
        </Card>
      )}
      </div>
      </details>
    </HubPage>
  );
}
