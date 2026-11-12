import { formatDate } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Card, HubPage, PageLoading } from "@/components/hub-ui";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { Button } from "@/components/ui/button";
import type { Interval, PlanId } from "@/lib/billing.config";
import { confirmWalletPaymentFn, getBillingFn } from "@/lib/billing.functions";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";

export const Route = createFileRoute("/billing/$slug")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string | undefined } => ({
    session_id: typeof s["session_id"] === "string" ? s["session_id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Plan & billing — Family Wallet" },
      {
        name: "description",
        content: "See your household plan, upgrade, and manage your card and invoices.",
      },
      { property: "og:title", content: "Plan & billing — Family Wallet" },
      {
        property: "og:description",
        content: "Your household plan, upgrades, card and invoices in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

const PLAN_NAMES: Record<string, string> = { family: "Family" };
const PRICES: Record<"family", Record<Interval, string>> = {
  family: { month: "£19.99 a month", year: "£199 a year" },
};

function BillingPage() {
  const { slug } = Route.useParams();
  const { session_id } = Route.useSearch();
  const navigate = Route.useNavigate();
  const client = useQueryClient();
  const load = useServerFn(getBillingFn);
  const confirm = useServerFn(confirmWalletPaymentFn);
  const query = useQuery({ queryKey: ["billing", slug], queryFn: () => load({ data: { slug } }) });
  const [native, setNative] = useState(false);
  const [checkout, setCheckout] = useState<{ plan: PlanId; interval: Interval } | null>(null);
  const [interval, setInterval] = useState<Interval>("month");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setNative(document.documentElement.classList.contains("native-app")), []);

  // Back from Stripe: record the payment now rather than waiting for the webhook.
  useEffect(() => {
    if (!session_id) return;
    confirm({ data: { slug, sessionId: session_id, environment: getStripeEnvironment() } })
      .then((r) =>
        setNotice(
          r.ok
            ? "Thank you. Your plan is active."
            : "Payment received. It can take a minute to show here.",
        ),
      )
      .catch(() => setNotice("Payment received. It can take a minute to show here."))
      .finally(() => {
        void client.invalidateQueries();
        void navigate({ search: { session_id: undefined }, replace: true });
      });
  }, [session_id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (query.isLoading) return <PageLoading />;
  const data = query.data;

  if (!data) {
    return (
      <HubPage slug={slug} title="Plan & billing">
        <Card>
          <p className="text-sm text-muted-foreground">
            Only parents can see the household plan and billing.
          </p>
        </Card>
      </HubPage>
    );
  }

  const sub = data.subscription;
  const current = sub?.live ? sub.plan : null;

  return (
    <HubPage
      slug={slug}
      title="Plan & billing"
      intro="Your household plan, card and invoices. Only parents see this page."
    >
      {notice && (
        <div className="mb-4 rounded-xl bg-tint-sage px-4 py-3 text-sm text-foreground">
          {notice}
        </div>
      )}

      <Card>
        <h2 className="font-medium text-foreground">Your plan</h2>
        {data.agencyManaged ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Your wallet is provided by your agency, so there is nothing to pay here.
          </p>
        ) : sub ? (
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                {PLAN_NAMES[sub.plan] ?? sub.plan}
              </span>
              , billed {sub.interval === "year" ? "yearly" : "monthly"}
              {!sub.live && " (ended)"}
              {sub.status === "past_due" && " (payment overdue, please update your card)"}
            </p>
            {sub.renews && sub.live && (
              <p>
                {sub.cancelling ? "Ends on " : "Renews on "}
                {formatDate(sub.renews, { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No plan yet.</p>
        )}
      </Card>

      {native ? (
        <Card className="mt-4">
          <p className="text-sm text-muted-foreground">
            To manage or upgrade your household plan, open your private wallet link in any web
            browser.
          </p>
        </Card>
      ) : data.agencyManaged ? null : sub?.live ? (
        <Card className="mt-4">
          <h2 className="font-medium text-foreground">Manage billing</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Update your card, download invoices or cancel. Your plan includes every feature and
            unlimited staff.
          </p>
          <form method="post" action="/api/stripe/portal" className="mt-4">
            <input type="hidden" name="slug" value={slug} />
            <Button type="submit">Manage billing &amp; invoices</Button>
          </form>
        </Card>
      ) : !paymentsConfigured() ? (
        <Card className="mt-4">
          <p className="text-sm text-muted-foreground">
            Payments are not switched on yet. Please contact support.
          </p>
        </Card>
      ) : checkout ? (
        <Card className="mt-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-medium text-foreground">
              {PLAN_NAMES[checkout.plan]} plan,{" "}
              {PRICES[checkout.plan as "family"][checkout.interval]}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setCheckout(null)}>
              Back
            </Button>
          </div>
          <StripeEmbeddedCheckout
            key={`${checkout.plan}-${checkout.interval}`}
            plan={checkout.plan}
            interval={checkout.interval}
            slug={slug}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Prices exclude VAT, which is added at checkout. Everything already in your wallet stays
            as it is.
          </p>
        </Card>
      ) : (
        <Card className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-foreground">Choose a plan</h2>
            <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
              {(["month", "year"] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInterval(i)}
                  className={`rounded-md px-3 py-1 ${interval === i ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {i === "month" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["family"] as const).map((plan) => (
              <div key={plan} className="rounded-xl border border-border p-4">
                <p className="font-medium text-foreground">{PLAN_NAMES[plan]}</p>
                <p className="mt-1 text-sm text-muted-foreground">{PRICES[plan][interval]}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Every feature, unlimited staff.
                </p>
                <Button
                  className="mt-3 w-full"
                  variant="default"
                  onClick={() => setCheckout({ plan, interval })}
                >
                  Choose {PLAN_NAMES[plan]}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </HubPage>
  );
}
