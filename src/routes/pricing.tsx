import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { onMailtoClick } from "@/lib/mailto";
import { CONTACT_EMAIL } from "@/lib/site";
import { breadcrumbLd, faqLd, pageHead, softwareLd } from "@/lib/seo";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import type { Interval, PlanId } from "@/lib/billing.config";
import { intervalsFor } from "@/lib/billing.config";
import { paymentsConfigured } from "@/lib/stripe";

type Audience = "families" | "agencies";

export const Route = createFileRoute("/pricing")({
  validateSearch: (search: Record<string, unknown>): { for?: Audience } =>
    search["for"] === "agencies" ? { for: "agencies" } : {},
  head: () =>
    pageHead({
      title: "Pricing: Family Wallet Plans for Families & Agencies",
      description:
        "Family £9.99 a month for one nanny or au pair, Household £19.99 for up to six staff. Plans for nanny agencies too. Nannies and au pairs never pay.",
      path: "/pricing",
      jsonLd: [
        softwareLd([
          { name: "Family", price: "9.99", description: "One nanny or au pair, billed monthly, excluding VAT." },
          { name: "Household", price: "19.99", description: "Up to six staff, billed monthly, excluding VAT." },
        ]),
        faqLd(faqs.families),
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ]),
      ],
    }),
  component: PricingPage,
});

/* Swap these when checkout and a sales inbox exist */
const mail = (subject: string) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

const frame = "mx-auto w-full max-w-[84rem] px-4 sm:px-8";

type Feature = { text: string; soon?: boolean };
type Tier = {
  name: string;
  monthly: number | null; // null = custom price
  annual?: number;
  unit?: string;
  who: string;
  features: Feature[];
  lead?: string;
  cta: { label: string; href: string };
  /** Set for plans people can buy themselves; the button then opens the payment form. */
  plan?: PlanId;
  popular?: boolean;
};

const families: Tier[] = [
  {
    name: "Family",
    monthly: 9.99,
    annual: 99,
    who: "One nanny or au pair, run properly.",
    features: [
      { text: "1 nanny or au pair (need more? move to Household)" },
      { text: "Shared week calendar, daily log and messages" },
      { text: "Alerts when your carer adds notes or photos, or asks to change the schedule or book holiday" },
      { text: "Emergency card and medication log" },
      { text: "Timesheets, expenses and a Friday weekly report" },
      { text: "Customer support by email" },
    ],
    cta: { label: "Subscribe", href: mail("Family Wallet: Family plan") },
    plan: "family",
    popular: true,
  },
  {
    name: "Household",
    monthly: 19.99,
    annual: 199,
    who: "A nanny, an au pair, a housekeeper, a driver.",
    lead: "Everything in Family, plus",
    features: [
      { text: "Up to 6 staff, each with their own sign-in" },
      { text: "Agreement builder, signed by both of you" },
      { text: "House manual and codes, hidden until revealed" },
      { text: "Employment cost calculator" },
      { text: "Au pair and live-in tools: pocket money, hours cap, days off and house rules" },
      { text: "More than one property", soon: true },
      { text: "Exports for your accountant", soon: true },
      { text: "Priority support" },
    ],
    cta: { label: "Subscribe", href: mail("Family Wallet: Household plan") },
    plan: "household",
  },
  {
    name: "Estate",
    monthly: null,
    who: "Family offices and large households.",
    lead: "Everything in Household, plus",
    features: [
      { text: "Unlimited staff" },
      { text: "Several properties and teams" },
      { text: "A named contact" },
      { text: "Help setting up and importing records" },
      { text: "Dedicated customer support" },
    ],
    cta: { label: "Get a quote", href: mail("Family Wallet: Estate") },
  },
];

const agencies: Tier[] = [
  {
    name: "Partner",
    monthly: 69,
    who: "Give your first families a wallet.",
    features: [
      { text: "10 active households" },
      { text: "Extra households £3/mo each" },
      { text: "Your logo, “Powered by The Family Wallet”" },
      { text: "Copy each family's link and code in one tap" },
      { text: "Bulk import of existing families", soon: true },
      { text: "Basic agency dashboard" },
      { text: "Ongoing customer support" },
    ],
    cta: { label: "Subscribe", href: mail("Family Wallet for agencies: Partner") },
    plan: "agency_partner",
  },
  {
    name: "Growth",
    monthly: 149,
    who: "Make it part of your membership.",
    lead: "Everything in Partner, plus",
    features: [
      { text: "50 active households" },
      { text: "Extra households £2/mo each" },
      { text: "Your logo, colours and subdomain" },
      { text: "Dashboard: set-up status, signed agreements, expiring checks" },
      { text: "Manage your own perks and playbooks" },
      { text: "Continued support, from set-up onwards" },
    ],
    cta: { label: "Subscribe", href: mail("Family Wallet for agencies: Growth") },
    plan: "agency_growth",
    popular: true,
  },
  {
    name: "Scale",
    monthly: 249,
    who: "A growing client base across a team.",
    lead: "Everything in Growth, plus",
    features: [
      { text: "100 active households" },
      { text: "Extra households £1.50/mo each" },
      { text: "Your own domain, fully white-labelled" },
      { text: "Continued priority support" },
      { text: "Staff roles and permissions" },
    ],
    cta: { label: "Subscribe", href: mail("Family Wallet for agencies: Scale") },
    plan: "agency_scale",
  },
  {
    name: "Enterprise",
    monthly: null,
    who: "More than 100 households.",
    lead: "Everything in Scale, plus",
    features: [
      { text: "100+ active households, priced to your volume" },
      { text: "Help moving your existing families across" },
      { text: "API and single sign-on", soon: true },
      { text: "Dedicated account manager and continued support" },
    ],
    cta: { label: "Get a quote", href: mail("Family Wallet for agencies: Enterprise") },
  },
];

/* Everything inside the wallet, per tier, for the expandable list under each card. */
const DAY_TO_DAY = ["Shared week calendar (day, week and month)", "Daily log, photo moments and weekly Friday report", "Topic messages with unread alerts", "Notification bell and phone alerts", "Today: naps, feeds, meals and potty", "Medication log and incident reports", "Handover notes and expenses", "Permissions and consents", "Emergency card", "Children & routines and Kids' playbook", "Travel pack and First 48 hours checklist", "Timesheets (nanny and babysitting), holiday & leave", "Petty cash float", "Secure bank details", "Working hours rota", "Nanny training and certificates", "Safety records (DBS, first aid, insurance)", "Payroll setup via our partner Nannytax", "Customer support by email"];
const HOUSEHOLD_EXTRA = ["Up to 6 staff with their own roles and sign-ins", "Agreement builder, signed by both sides (incl. two-week rota)", "House manual & codes, hidden until revealed", "Au pair & live-in: pocket money, hours cap, days off, room & house rules", "Employment cost calculator", "Priority support"];
type Group = { title: string; items: string[] };
const tierIncludes: Record<string, Group[]> = {
  Family: [{ title: "Day to day (1 carer)", items: DAY_TO_DAY }],
  Household: [{ title: "Everything in Family", items: DAY_TO_DAY }, { title: "Household extras", items: HOUSEHOLD_EXTRA }],
  Estate: [{ title: "Everything in Household", items: [...DAY_TO_DAY, ...HOUSEHOLD_EXTRA] }, { title: "Estate extras", items: ["Unlimited staff", "Several properties and teams", "A named contact", "Help importing records"] }],
};

function TierDetails({ groups }: { groups: Group[] }) {
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <details className="group mt-6 rounded-xl bg-muted/50 p-4">
      <summary className="cursor-pointer list-none text-[0.9375rem] font-medium text-foreground">
        <span className="group-open:hidden">See everything included ({total})</span>
        <span className="hidden group-open:inline">Hide full list</span>
      </summary>
      {groups.map((g) => (
        <div key={g.title} className="mt-4">
          <p className="text-[0.8125rem] font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</p>
          <ul className="mt-2 space-y-1.5">
            {g.items.map((i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground"><Check className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />{i}</li>
            ))}
          </ul>
        </div>
      ))}
    </details>
  );
}

const payOptions = [
  {
    title: "You include it in the membership",
    body: "You pay per active household. At Growth with 40 families that is under £4 a family a month, a small part of a £50 membership.",
  },
  {
    title: "You resell it",
    body: "You pay the household rate and charge your families whatever you like, for example £9.99 to £12.99 a month.",
  },
  {
    title: "You refer families",
    body: "Families subscribe to a Family plan themselves with your code, and you earn 20% for the first 12 months.",
  },
];

const faqs: Record<Audience, { q: string; a: string }[]> = {
  families: [
    {
      q: "Is there a free version?",
      a: "No. The wallet is a paid plan for your household. Explore the demo wallet first, a sample family with their nanny, to see exactly what you would get.",
    },
    {
      q: "What if I need more staff than my plan includes?",
      a: "Move up a plan. Family covers one nanny or au pair; Household covers up to six staff; Estate covers unlimited. You can upgrade any time from Manage subscription and the difference is worked out for you.",
    },
    {
      q: "Does my nanny or au pair pay?",
      a: "No. Nannies, au pairs and other staff always join free. You pay for the household.",
    },
    {
      q: "What counts as a staff member?",
      a: "Anyone you give their own login: a nanny, au pair, housekeeper, cook, driver or personal assistant. Family members who share the household are not counted.",
    },
    {
      q: "Can I switch plans or cancel?",
      a: "Yes. Cancel any time from your wallet. Your plan stays active until the end of the period you have paid for. To change plan, get in touch and we will switch you.",
    },
    {
      q: "My agency already gave me a wallet. Do I pay?",
      a: "Not if your agency includes it in your membership. If you leave the agency, you keep your records and can move to a Family plan.",
    },
    {
      q: "Is this payroll?",
      a: "No. The wallet holds your agreement, hours and records. For payroll, contact support and we'll connect you with our partners at Nannytax and send you a unique referral code.",
    },
  ],
  agencies: [
    {
      q: "What is an active household?",
      a: "A household where someone signed in during the last 30 days. Families who have gone quiet do not count towards your allowance.",
    },
    {
      q: "Do my nannies and au pairs need a paid seat?",
      a: "No. Nanny and au pair seats are always free and unlimited. You only count households.",
    },
    {
      q: "Can I bring my existing families on?",
      a: "Yes. Add each family in your dashboard and copy their link and access code to send on. Bulk import from a spreadsheet is on the way."
    },
    {
      q: "What happens when a family leaves my agency?",
      a: "They keep their records and can move to their own Family plan. Your code can give them a discount.",
    },
    {
      q: "Is there a setup fee or contract?",
      a: "No setup fee. Plans are monthly and you can cancel with a month's notice.",
    },
  ],
};

function money(n: number) {
  return Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`;
}

function PricingPage() {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(document.documentElement.classList.contains("native-app")), []);
  if (native) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-2xl">Plans are managed on our website</h1>
        <p className="mt-3 text-muted-foreground">
          Sign in with your wallet link and access code to use your family wallet here.
        </p>
      </main>
    );
  }
  return <PricingPageInner />;
}

function PricingPageInner() {
  const audience: Audience = Route.useSearch().for ?? "families";
  const navigate = useNavigate({ from: Route.fullPath });
  const [annual, setAnnual] = useState(true);
  const [checkout, setCheckout] = useState<{ plan: PlanId; interval: Interval } | null>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);
  const tiers = audience === "families" ? families : agencies;

  // Paying is only possible once this build has a Stripe token; until then the buttons
  // fall back to the "talk to us" email.
  const canPay = paymentsConfigured();

  useEffect(() => {
    if (checkout) checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [checkout]);

  const pick = (a: Audience) => {
    // Leaving the tab that holds the payment form closes it, so it is never left open
    // showing a plan from the other side.
    setCheckout(null);
    navigate({ search: { for: a }, replace: true });
  };

  return (
    <div className="min-h-svh overflow-x-clip bg-background">
      <header className="border-b border-border/70">
        <div className={cn(frame, "flex h-16 items-center justify-between gap-6")}>
          <Link to="/" className="heading-serif text-[1.375rem] leading-none text-foreground">
            The Family Wallet
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <Link to="/demo">Demo</Link>
            </Button>
            <Button asChild>
              <Link to="/login">Open my wallet</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className={cn(frame, "pb-24 pt-14 lg:pt-20")}>
        <h1 className="heading-serif max-w-3xl text-balance text-[2.75rem] leading-[1.04] text-foreground sm:text-[4rem]">
          Simple pricing for every household
        </h1>
        <p className="mt-6 max-w-[38rem] text-pretty text-lg leading-relaxed text-foreground sm:text-xl">
          Whether you employ a nanny, an au pair or a team of household staff, or you are an agency
          who wants every family to have a wallet. Nannies and au pairs never pay.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <div
            role="tablist"
            aria-label="Who is this for"
            className="inline-flex rounded-full border border-input bg-card p-1"
          >
            {(["families", "agencies"] as const).map((a) => (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={audience === a}
                onClick={() => pick(a)}
                className={cn(
                  "h-10 cursor-pointer rounded-full px-5 text-[0.9375rem] font-medium transition-colors duration-200",
                  audience === a
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {a === "families" ? "For families" : "For agencies"}
              </button>
            ))}
          </div>

          {audience === "families" && (
            <div
              role="group"
              aria-label="Billing period"
              className="inline-flex rounded-full border border-input bg-card p-1"
            >
              {[
                { v: false, label: "Monthly" },
                { v: true, label: "Yearly, save about 17%" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={annual === o.v}
                  onClick={() => setAnnual(o.v)}
                  className={cn(
                    "h-10 cursor-pointer rounded-full px-5 text-[0.9375rem] font-medium transition-colors duration-200",
                    annual === o.v
                      ? "bg-brand text-brand-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <section
          aria-label={audience === "families" ? "Family plans" : "Agency plans"}
          className={cn(
            "mt-10 grid gap-5",
            audience === "families" ? "lg:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4",
          )}
        >
          {tiers.map((t) => {
            const showAnnual = audience === "families" && annual && t.annual !== undefined;
            const price = t.monthly === null ? null : showAnnual ? t.annual! : t.monthly;
            const plan = t.plan;
            return (
              <article
                key={t.name}
                className={cn(
                  "flex flex-col rounded-2xl bg-card p-7 sm:p-8",
                  t.popular ? "ring-2 ring-brand" : "ring-1 ring-border",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="heading-serif text-[1.75rem] leading-none text-foreground">
                    {t.name}
                  </h2>
                  {t.popular && (
                    <span className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
                  {t.who}
                </p>
                <p className="mt-6 flex items-baseline gap-1.5 text-foreground">
                  <span className="num heading-serif text-[3rem] leading-none">
                    {price === null ? "Custom" : money(price)}
                  </span>
                  {price !== null && (
                    <span className="text-[0.9375rem] text-muted-foreground">
                      {showAnnual ? "a year" : "a month"}
                    </span>
                  )}
                </p>
                <p className="mt-1.5 min-h-5 text-[0.8125rem] text-muted-foreground">
                  {price === null
                    ? "Priced to your household"
                    : audience === "agencies"
                      ? "Excluding VAT. Billed monthly."
                      : showAnnual
                        ? `Or ${money(t.monthly!)} a month. Excluding VAT.`
                        : "Excluding VAT."}
                </p>
                {plan && canPay ? (
                  <Button
                    size="lg"
                    variant={t.popular ? "default" : "outline"}
                    className="mt-6 w-full"
                    onClick={() =>
                      // Agency plans are monthly only, so the yearly toggle is ignored for them.
                      setCheckout({
                        plan,
                        interval:
                          annual && intervalsFor(plan).includes("year") ? "year" : "month",
                      })
                    }
                  >
                    {t.cta.label} <ArrowRight aria-hidden />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant={t.popular ? "default" : "outline"}
                    className="mt-6 w-full"
                    asChild
                  >
                    <a href={t.cta.href} onClick={t.cta.href.startsWith("mailto:") ? onMailtoClick : undefined}>
                      {t.cta.label} <ArrowRight aria-hidden />
                    </a>
                  </Button>
                )}
                <div className="mt-7 border-t border-border pt-6">
                  {t.lead && (
                    <p className="mb-3 text-[0.9375rem] font-medium text-foreground">{t.lead}</p>
                  )}
                  <ul className="space-y-3">
                    {t.features.map((f) => (
                      <li
                        key={f.text}
                        className="flex gap-3 text-[0.9375rem] leading-snug text-foreground"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                        <span>
                          {f.text}
                          {f.soon && (
                            <span className="ml-2 rounded-full bg-tint-sage px-2 py-0.5 text-[0.6875rem] font-medium text-tint-sage-ink">
                              Soon
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {tierIncludes[t.name] ? <TierDetails groups={tierIncludes[t.name]!} /> : null}
                </div>
              </article>
            );
          })}
        </section>

        {checkout && (
          <section
            ref={checkoutRef}
            aria-label="Payment"
            className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-border sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="heading-serif text-[1.5rem] leading-tight text-foreground">
                  {checkout.plan === "family" ? "Family" : "Household"} plan
                </h2>
                <p className="mt-1 text-[0.9375rem] text-muted-foreground">
                  Billed {checkout.interval === "year" ? "yearly" : "monthly"}. Your wallet is
                  created the moment the payment goes through.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCheckout(null)}>
                <X aria-hidden /> Close
              </Button>
            </div>
            <div className="mt-5">
              {/* A new key per plan: Stripe's form fetches its payment details once when it
                  mounts, so reusing it for a different plan would keep the old one. */}
              <StripeEmbeddedCheckout
                key={`${checkout.plan}-${checkout.interval}`}
                plan={checkout.plan}
                interval={checkout.interval}
              />
            </div>
          </section>
        )}

        {audience === "agencies" && (
          <aside className="mt-5 flex flex-col gap-4 rounded-2xl bg-tint-sage p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="heading-serif text-[1.5rem] leading-tight text-foreground">
                Network
              </h2>
              <p className="mt-1.5 max-w-[40rem] text-[0.9375rem] leading-relaxed text-foreground">
                Franchises and groups with several brands or branches. Full white-label across every
                location and a dedicated team.
              </p>
            </div>
            <Button size="lg" variant="outline" className="shrink-0" asChild>
              <a href={mail("Family Wallet: Network")} onClick={onMailtoClick}>Get a quote</a>
            </Button>
          </aside>
        )}

        {audience === "agencies" && (
          <section className="mt-20 grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <h2 className="heading-serif text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl">
                You choose who pays
              </h2>
              <p className="mt-5 max-w-[30rem] text-lg leading-relaxed text-foreground">
                The same wallet works whether you include it, resell it or simply refer families.
                Mix them across your clients.
              </p>
            </div>
            <ol className="space-y-8 lg:col-span-6 lg:col-start-7">
              {payOptions.map((o, i) => (
                <li key={o.title} className="border-t border-border pt-5">
                  <h3 className="text-[1.0625rem] font-semibold text-foreground">
                    {i + 1}. {o.title}
                  </h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">
                    {o.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="mt-20 grid gap-10 lg:grid-cols-12 lg:gap-8">
          <h2 className="heading-serif text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl lg:col-span-4">
            Questions
          </h2>
          <Accordion type="single" collapsible className="lg:col-span-7 lg:col-start-6">
            {faqs[audience].map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left text-[1.0625rem]">{f.q}</AccordionTrigger>
                <AccordionContent className="text-[0.9375rem] leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <p className="mt-16 max-w-[44rem] text-xs leading-relaxed text-muted-foreground">
          Prices exclude VAT, which is added at checkout. Plans marked Soon are on the way and are not
          in the app yet.
        </p>
      </main>
    </div>
  );
}
