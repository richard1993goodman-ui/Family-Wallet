import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { claimSubscription } from "@/lib/billing.functions";
import { siteUrl } from "@/lib/site";

export const Route = createFileRoute("/subscribed")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } =>
    typeof search["session_id"] === "string" ? { session_id: search["session_id"] } : {},
  head: () => ({
    meta: [{ title: "Your wallet is ready | The Family Wallet" }, { name: "robots", content: "noindex" }],
  }),
  component: Subscribed,
});

function Subscribed() {
  const { session_id: sessionId } = Route.useSearch();
  const claim = useServerFn(claimSubscription);
  const query = useQuery({
    queryKey: ["claim", sessionId],
    enabled: Boolean(sessionId),
    queryFn: () => claim({ data: { sessionId: sessionId! } }),
    // Cards that need extra checking can take a moment to settle.
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 3000 : false),
    retry: false,
  });
  const result = query.data;

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center px-4 py-16">
      <p className="heading-serif text-center text-[1.75rem] leading-none text-foreground">
        The Family Wallet
      </p>

      {!sessionId && (
        <Message title="We can't find that payment" body="Open the link from your payment confirmation, or get in touch and we will sort it out." />
      )}
      {sessionId && query.isLoading && (
        <Message title="Setting up your wallet" body="This only takes a moment." />
      )}
      {query.isError && (
        <Message
          title="We couldn't confirm your payment yet"
          body="If you have been charged, your wallet is on its way. Refresh in a minute or two, or get in touch and we will send your details."
        />
      )}
      {result?.status === "pending" && (
        <Message title="Confirming your payment" body="Your bank is still checking. This page will update on its own." />
      )}

      {result?.status === "ready" && (
        <div className="mt-8 rounded-2xl bg-card p-7 ring-1 ring-border">
          <h1 className="heading-serif text-[2rem] leading-tight text-foreground">
            Your wallet is ready
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
            You are signed in on this device. Keep these two things safe: you will need them to open
            your wallet on another phone or computer.{" "}
            {result.emailing
              ? "We are also emailing a copy to you."
              : "Take a screenshot or copy them somewhere safe."}
          </p>
          <dl className="mt-6 space-y-4">
            <div>
              <dt className="text-sm font-medium text-foreground">Wallet link</dt>
              <dd className="mt-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground">
                {siteUrl(`/w/${result.slug}`)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-foreground">Access code</dt>
              <dd className="mt-1 rounded-md bg-muted px-3 py-2 font-mono text-lg tracking-[0.2em] text-foreground">
                {result.code}
              </dd>
            </div>
          </dl>
          <Button size="lg" className="mt-7 w-full" asChild>
            <Link to="/w/$slug" params={{ slug: result.slug }}>
              Open my wallet <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      )}
    </main>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 rounded-2xl bg-card p-7 ring-1 ring-border">
      <h1 className="heading-serif text-[1.75rem] leading-tight text-foreground">{title}</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
