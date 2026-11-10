import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Download, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { claimSubscription } from "@/lib/billing.functions";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
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
    queryFn: () =>
      claim({
        data: {
          sessionId: sessionId!,
          environment: paymentsConfigured() ? getStripeEnvironment() : "sandbox",
        },
      }),
    // Cards that need extra checking can take a moment to settle.
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 3000 : false),
    retry: false,
  });
  const result = query.data;
  const [saved, setSaved] = useState(false);

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

      {result?.status === "ready" && result.kind === "agency" && (
        <div className="mt-8 rounded-2xl bg-card p-7 ring-1 ring-border">
          <h1 className="heading-serif text-[2rem] leading-tight text-foreground">
            Your agency account is set up
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {result.agencyName} now has room for {result.allowance} active households. We have emailed
            a setup link to the address you paid with, and your account owner has been asked to
            create your agency login.
          </p>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
            Nothing else to do for now. If you have not heard from us within a working day, get in
            touch and we will sort it out.
          </p>
        </div>
      )}

      {result?.status === "ready" && result.kind === "family" && (
        <div className="mt-8 rounded-2xl bg-card p-7 ring-1 ring-border">
          <h1 className="heading-serif text-[2rem] leading-tight text-foreground">
            Your wallet is ready
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
            You are signed in on this device.{" "}
            {result.emailing ? "We are also emailing a copy to you." : ""}
          </p>
          <div className="mt-5 flex gap-3 rounded-lg border-2 border-primary bg-accent p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 flex-none text-primary" aria-hidden />
            <div className="text-sm leading-relaxed text-foreground">
              <p className="font-semibold">Save these now</p>
              <p className="mt-1 text-muted-foreground">
                You need both to open your wallet on another phone or computer, and they're easy to lose. Copy them into your
                Notes app or a password manager, or take a screenshot.
              </p>
            </div>
          </div>
          <dl className="mt-5 space-y-4">
            <div>
              <dt className="flex items-center justify-between gap-3 text-sm font-medium text-foreground">
                Wallet link
                <CopyButton text={siteUrl(`/w/${result.slug}`)} />
              </dt>
              <dd className="mt-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground">
                {siteUrl(`/w/${result.slug}`)}
              </dd>
            </div>
            <div>
              <dt className="flex items-center justify-between gap-3 text-sm font-medium text-foreground">
                Access code
                <CopyButton text={result.code} />
              </dt>
              <dd className="mt-1 rounded-md bg-muted px-3 py-2 font-mono text-lg tracking-[0.2em] text-foreground">
                {result.code}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <CopyButton
              label="Copy both"
              text={`The Family Wallet\nWallet link: ${siteUrl(`/w/${result.slug}`)}\nAccess code: ${result.code}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const text = `The Family Wallet\r\nWallet link: ${siteUrl(`/w/${result.slug}`)}\r\nAccess code: ${result.code}\r\n`;
                const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
                const link = document.createElement("a");
                link.href = url;
                link.download = "family-wallet-login.txt";
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 30000);
              }}
            >
              <Download aria-hidden /> Save as a file
            </Button>
          </div>
          <label className="mt-5 flex items-start gap-3 text-sm text-foreground">
            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
            I've saved my link and code somewhere safe
          </label>
          <Button size="lg" className="mt-6 w-full" variant={saved ? "default" : "outline"} asChild>
            <Link to="/w/$slug" params={{ slug: result.slug }}>
              Open my wallet <ArrowRight aria-hidden />
            </Link>
          </Button>
          {!saved && (
            <p className="mt-2 text-center text-[0.8125rem] text-muted-foreground">
              Tick the box above once you've saved them.{result.emailing ? " Your details are also in the welcome email." : ""}
            </p>
          )}
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
