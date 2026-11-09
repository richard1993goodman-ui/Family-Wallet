import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { breadcrumbLd, faqLd, pageHead, softwareLd } from "@/lib/seo";

type Audience = "families" | "agencies";

export const Route = createFileRoute("/pricing")({
  validateSearch: (search: Record<string, unknown>): { for?: Audience } =>
    search["for"] === "agencies" ? { for: "agencies" } : {},
  head: () =>
    pageHead({
      title: "Pricing: Family Wallet Plans for Families & Agencies",
      description:
        "Family £7.99 a month for one nanny or au pair, Household £14.99 for up to six staff. Plans for nanny agencies too. Nannies and au pairs never pay.",
      path: "/pricing",
      jsonLd: [
        softwareLd([
          { name: "Family", price: "7.99", description: "One nanny or au pair, billed monthly, excluding VAT." },
          { name: "Household", price: "14.99", description: "Up to six staff, billed monthly, excluding VAT." },
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
const CONTACT = "richard@athletemannies.com";
const mail = (subject: string) => `mailto:${CONTACT}?subject=${encodeURIComponent(subject)}`;

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
  /** Set for plans families can buy themselves; the button then goes to Stripe Checkout. */
  plan?: "family" | "household";
  popular?: boolean;
};

const families: Tier[] = [
  {
    name: "Family",
    monthly: 7.99,
    annual: 79,
    who: "One nanny or au pair, run properly.",
    features: [
      { text: "1 nanny or au pair (extra staff £3/mo each)" },
      { text: "Shared week calendar, daily log and messages" },
      { text: "Agreement signed by both of you" },
      { text: "House manual and codes, hidden until revealed" },
      { text: "Emergency card and medication log" },
      { text: "Timesheets, expenses and a Friday weekly report" },
    ],
    cta: { label: "Subscribe", href: mail("Family Wallet: Family plan") },
    plan: "family",
    popular: true,
  },
  {
    name: "Household",
    monthly: 14.99,
    annual: 149,
    who: "A nanny, an au pair, a housekeeper, a driver.",
    lead: "Everything in Family, plus",
    features: [
      { text: "Up to 6 staff (extra staff £3/mo each)" },
      { text: "Employment cost calculator" },
      { text: "Au pair and live-in tools: hours and days off", soon: true },
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
    ],
    cta: { label: "Talk to us", href: mail("Family Wallet: Estate") },
  },
];

const agencies: Tier[] = [
  {
    name: "Partner",
    monthly: 39,
    who: "Give your first families a wallet.",
    features: [
      { text: "10 active households" },
      { text: "Extra households £3/mo each" },
      { text: "Your logo, “Powered by The Family Wallet”" },
      { text: "Copy each family's link and code in one tap" },
      { text: "Bulk import of existing families", soon: true },
      { text: "Basic agency dashboard" },
    ],
    cta: { label: "Talk to us", href: mail("Family Wallet for agencies: Partner") },
  },
  {
    name: "Growth",
    monthly: 119,
    who: "Make it part of your membership.",
    lead: "Everything in Partner, plus",
    features: [
      { text: "50 active households" },
      { text: "Extra households £2/mo each" },
      { text: "Your logo, colours and subdomain" },
      { text: "Dashboard: set-up status, signed agreements, expiring checks" },
      { text: "Manage your own perks and playbooks" },
      { text: "One set-up call" },
    ],
    cta: { label: "Talk to us", href: mail("Family Wallet for agencies: Growth") },
    popular: true,
  },
  {
    name: "Scale",
    monthly: 199,
    who: "A growing client base across a team.",
    lead: "Everything in Growth, plus",
    features: [
      { text: "100 active households" },
      { text: "Extra households £1.50/mo each" },
      { text: "Your own domain, fully white-labelled" },
      { text: "Staff roles and permissions" },
      { text: "Priority support" },
    ],
    cta: { label: "Talk to us", href: mail("Family Wallet for agencies: Scale") },
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
      { text: "Dedicated account manager" },
    ],
    cta: { label: "Talk to us", href: mail("Family Wallet for agencies: Enterprise") },
  },
];

const payOptions = [
  {
    title: "You include it in the membership",
    body: "You pay per active household. At Growth with 40 families that is about £3 a family a month, a small part of a £50 membership.",
  },
  {
    title: "You resell it",
    body: "You pay the household rate and charge your families whatever you like, for example £7.99 to £9.99 a month.",
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
      a: "No. The wallet holds your agreement, week, logs and costs, and works alongside whichever payroll service you use.",
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
  const audience: Audience = Route.useSearch().for ?? "families";
  const navigate = useNavigate({ from: Route.fullPath });
  const [annual, setAnnual] = useState(true);
  const tiers = audience === "families" ? families : agencies;

  const pick = (a: Audience) => navigate({ search: { for: a }, replace: true });

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
                {t.plan ? (
                  <form
                    method="post"
                    action="/api/stripe/checkout"
                    className="mt-6"
                    onSubmit={(e) => {
                      // Stripe's payment page cannot load inside a frame, such as Lovable's preview.
                      if (window.self !== window.top) e.currentTarget.target = "_blank";
                    }}
                  >
                    <input type="hidden" name="plan" value={t.plan} />
                    <input type="hidden" name="interval" value={annual ? "year" : "month"} />
                    <Button
                      type="submit"
                      size="lg"
                      variant={t.popular ? "default" : "outline"}
                      className="w-full"
                    >
                      {t.cta.label} <ArrowRight aria-hidden />
                    </Button>
                  </form>
                ) : (
                  <Button
                    size="lg"
                    variant={t.popular ? "default" : "outline"}
                    className="mt-6 w-full"
                    asChild
                  >
                    <a href={t.cta.href}>
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
                </div>
              </article>
            );
          })}
        </section>

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
              <a href={mail("Family Wallet: Network")}>Talk to us</a>
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
