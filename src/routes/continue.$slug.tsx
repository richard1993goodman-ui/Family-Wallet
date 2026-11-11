import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getContinuationFn } from "@/lib/billing.functions";
import { PLANS, type Interval, type PlanId } from "@/lib/billing.config";
import { unlockWallet } from "@/lib/wallet.functions";

export const Route = createFileRoute("/continue/$slug")({
  head: () => ({ meta: [{ title: "Continue with Family Wallet" }, { name: "robots", content: "noindex" }] }),
  component: ContinuePage,
});

const OFFERED: PlanId[] = ["family", "household"];
const price = (plan: PlanId, interval: Interval) => `£${(PLANS[plan].pence[interval] / 100).toFixed(2)} + VAT per ${interval}`;

function ContinuePage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const stateFn = useServerFn(getContinuationFn);
  const unlockFn = useServerFn(unlockWallet);
  const state = useQuery({ queryKey: ["continuation", slug], queryFn: () => stateFn({ data: { slug } }) });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [interval, setInterval] = useState<Interval>("month");
  const [plan, setPlan] = useState<PlanId | null>(null);

  const open = async () => {
    setBusy(true);
    try {
      const result = await unlockFn({ data: { slug, code } });
      if (!result.ok) throw new Error(result.reason === "rate_limited" ? "Too many tries. Wait a few minutes." : "That code doesn't match.");
      await client.invalidateQueries({ queryKey: ["continuation", slug] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't check that code.");
    } finally {
      setBusy(false);
    }
  };

  const data = state.data;
  const until = data?.endsAt ? new Date(data.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-10">
      <h1 className="heading-display text-3xl text-foreground">Continue with Family Wallet</h1>
      {state.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : !data ? (
        <div className="mt-4 rounded-2xl bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Enter your wallet's 6-character access code to continue.</p>
          <Input className="mt-3 h-12 text-center font-mono text-xl tracking-[0.3em]" maxLength={6} value={code} placeholder="ACCESS CODE" autoCapitalize="characters" onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <Button className="mt-3 w-full" disabled={busy || code.length < 6} onClick={open}>Continue</Button>
        </div>
      ) : data.state === "none" ? (
        <div className="mt-4 rounded-2xl bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Your wallet doesn't need anything from you right now.</p>
          <Button asChild className="mt-4"><Link to="/w/$slug" params={{ slug }}>Open my wallet</Link></Button>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.state === "transition"
              ? `Your agency-funded access is ending. You keep full access until ${until}. Choose a plan to carry on without a break.`
              : "Your subscription has ended and your wallet is paused. Everything you added is kept. Choose a plan to switch it back on."}{" "}
            Your wallet, household information and settings stay exactly as they are.
          </p>
          <div className="mt-5 flex gap-2">
            {(["month", "year"] as Interval[]).map((i) => (
              <Button key={i} size="sm" variant={interval === i ? "default" : "outline"} onClick={() => { setInterval(i); setPlan(null); }}>
                {i === "month" ? "Monthly" : "Yearly"}
              </Button>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            {OFFERED.map((p) => (
              <button key={p} type="button" onClick={() => setPlan(p)} className={`rounded-2xl bg-card p-4 text-left shadow-sm ring-2 ${plan === p ? "ring-primary" : "ring-transparent"}`}>
                <span className="block font-medium text-foreground">{PLANS[p].name.replace("The Family Wallet: ", "")}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{price(p, interval)}</span>
              </button>
            ))}
          </div>
          {plan && (
            <div className="mt-6">
              <StripeEmbeddedCheckout key={`${plan}-${interval}`} plan={plan} interval={interval} continueSlug={slug} />
            </div>
          )}
          <p className="mt-6 text-xs text-muted-foreground">You won't be charged unless you complete payment here.</p>
        </>
      )}
    </main>
  );
}
