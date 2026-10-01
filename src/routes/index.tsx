import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  FileText,
  IdCard,
  Calculator,
  Shield,
  Sparkles,
  KeyRound,
  LifeBuoy,
  Siren,
  Pill,
  Plane,
  CalendarCheck,
  Users,
  CalendarDays,
  NotebookPen,
  MessagesSquare,
  GraduationCap,
  Award,
  ClipboardCheck,
  Dumbbell,
  ReceiptText,
  UtensilsCrossed,
  BadgePercent,
  Gift,
  Library,
  Handshake,
  Landmark,
  LockKeyhole,
  Smartphone,
  ChevronDown,
  HeartHandshake,
} from "lucide-react";

import { unlockWallet } from "@/lib/wallet.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Family Wallet — Athlete Mannies & Nannies" },
      {
        name: "description",
        content:
          "Every Athlete Mannies family gets a private wallet holding their nanny agreement, nanny CV, membership details, guarantee and everyday nanny tools.",
      },
      { property: "og:title", content: "Family Wallet — Athlete Mannies & Nannies" },
      {
        property: "og:description",
        content:
          "Your nanny agreement, nanny CV, membership details, guarantee and nanny tools, all in one private link.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const benefitGroups = [
  {
    icon: CalendarDays,
    title: "Today & planning",
    summary: "Keep every handover, shift and family update in one calm daily view.",
    featured: ["Weekly planner", "Daily log", "Friday report"],
    items: [
      "Weekly planner — what's on each day, Monday to Sunday",
      "Daily log — how each day went",
      "End-of-day handover — homework, dinner, mood and tomorrow's kit",
      "Expenses tracker — petty cash and reimbursement notes",
      "Friday Weekly Report — a polished recap of the week, ready to print",
      "Timesheet calculator",
      "Travel & Villa Nanny Pack — travel mode with checklist and holiday handover notes",
    ],
  },
  {
    icon: Siren,
    title: "Family & safety",
    summary: "The essential people, details and safeguards your nanny needs at a glance.",
    featured: ["Emergency card", "Children's profiles", "Safety records"],
    items: [
      "Emergency card — key contacts and instructions at a glance",
      "Request cover — emergency cover, babysitting and extra days",
      "Your nanny's CV, profile and references",
      "Checks & credentials — DBS, ID and right to work",
      "Know my family — children's profiles and the nanny quick guide",
      "Medication log — timestamped doses so nobody double-doses",
      "Insurance & safeguarding record — clear check, training and cover status",
    ],
  },
  {
    icon: FileText,
    title: "Agreement & employment",
    summary: "Your working arrangement, pay tools and key documents stay together.",
    featured: ["Nanny agreement", "Employment costs", "Nannytax support"],
    items: [
      "Your nanny agreement",
      "Managed Nannytax setup — a guided introduction and visible next steps",
      "All-in employment cost calculator — pay, NI, pension and payroll estimates",
      "Your Nannytax referral code and membership perks",
      "Your membership tier, fees, terms and our family guarantee",
      "Reviews & check-ins — 6-month and yearly conversation guides",
    ],
  },
  {
    icon: HeartHandshake,
    title: "Support & membership",
    summary: "Direct agency support, trusted ideas and thoughtful extras for family life.",
    featured: ["Ask Athlete Mannies", "Member perks", "Training hub"],
    items: [
      "Ask Athlete Mannies — message us straight from the wallet",
      "Private nanny curation — personally selected profiles, never a public catalogue",
      "VIP Member Perks & London Partner Concierge — private offers and trusted recommendations",
      "Curated Seasonal Playbooks — timely activity, sport and family guides",
      "Active Kids Sports Passport — skills, challenges and confidence wins",
      "Nanny training hub — safeguarding, routines and emergencies",
      "Nanny training certificate — kept in the wallet once passed",
      "Nanny Fuel — cooking and meal ideas",
      "Nanny activity guide",
    ],
  },
];

function slugFromInput(input: string) {
  const trimmed = input.trim();
  // Accept a full wallet link or just the short name at the end.
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  const parts = withoutProtocol.split(/[/?#]/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  return last.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function FamilyLogin() {
  const navigate = useNavigate();
  const unlockFn = useServerFn(unlockWallet);
  const [link, setLink] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("wallet-link");
    if (saved) setLink(saved);
    else setRemember(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugFromInput(link);
    if (!slug) {
      toast.error("Please enter your wallet link.");
      return;
    }
    setBusy(true);
    try {
      const result = await unlockFn({ data: { slug, code } });
      if (result.ok) {
        if (remember) window.localStorage.setItem("wallet-link", slug);
        else window.localStorage.removeItem("wallet-link");
        navigate({ to: "/w/$slug", params: { slug } });
      } else {
        toast.error(
          result.reason === "rate_limited"
            ? "Too many tries. Please wait 15 minutes and try again."
            : "That code doesn't match that link. Please check both and try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  }


  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/85 p-5 shadow-xl shadow-primary/5 backdrop-blur-xl sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary to-transparent" />
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/15">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Member access</p>
          <h2 className="heading-display text-xl text-foreground">Open your family wallet</h2>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Use the private link and access code sent to your family.
      </p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="wallet-link">Your wallet link</Label>
          <Input
            id="wallet-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="e.g. smith-4f2a"
            autoComplete="off"
            required
            className="mt-1.5 h-11 bg-background/70"
          />
        </div>
        <div>
          <Label htmlFor="wallet-code">Access code</Label>
          <Input
            id="wallet-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="6-character code"
            autoComplete="off"
            maxLength={8}
            required
            className="mt-1.5 h-11 bg-background/70 uppercase tracking-widest"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-foreground/90">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mt-0.5 size-4 accent-[hsl(var(--primary))]"
          />
          <span>
            Remember this device — stay signed in for 12 months and keep my wallet link saved here.
          </span>
        </label>
        <Button type="submit" size="lg" className="w-full shadow-lg shadow-primary/15" disabled={busy}>
          {busy ? "Opening…" : "Open my wallet"}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
    </section>
  );
}

function Index() {
  return (
    <div className="min-h-screen overflow-hidden bg-sand">
      <header className="border-b border-border/70 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4 sm:px-8">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary font-display text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15">
            AM
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Athlete Mannies &amp; Nannies</p>
            <p className="text-xs text-muted-foreground">Private family membership</p>
          </div>
          <span className="ml-auto hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
            <LockKeyhole className="h-3.5 w-3.5 text-primary" /> Private &amp; secure
          </span>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pt-14">
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your childcare, beautifully organised</p>
            <h1 className="heading-display mt-3 text-4xl leading-tight text-primary sm:text-5xl">
              The Family Wallet
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/80 sm:text-lg">
              More than finding a nanny. Your membership keeps family routines, essential documents,
              everyday support and trusted agency guidance together in one private place.
            </p>
          </div>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <FamilyLogin />

              <div className="mt-4 rounded-2xl border border-secondary/70 bg-background/70 p-5 backdrop-blur-lg sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 flex-none items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <Smartphone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">New to the wallet?</p>
                    <h2 className="heading-display mt-1 text-xl text-foreground">Explore the demo</h2>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/75">
                  Step inside a complete sample family wallet with no login. Nothing in the demo is live.
                </p>
                <Button asChild variant="outline" size="lg" className="mt-4 w-full border-primary/30 bg-card/70">
                  <Link to="/demo">
                    View the demo wallet <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 lg:px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Inside your wallet</p>
              <h2 className="heading-display mt-2 text-3xl leading-tight text-foreground">
                Everything around your nanny, in one place
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A practical daily home for parents and nannies, backed by ongoing agency support.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {benefitGroups.map(({ icon: Icon, title, summary, featured }) => (
                  <article key={title} className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-lg transition-transform duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <h3 className="font-semibold text-foreground">{title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{summary}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {featured.map((label) => (
                        <span key={label} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-foreground/75">
                          {label}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="border-y border-border/70 bg-background/65 backdrop-blur-lg">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <details className="group rounded-xl border border-border bg-card/75">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:px-6">
                <div>
                  <h2 className="heading-display text-xl text-foreground">See everything included</h2>
                  <p className="mt-1 text-sm text-muted-foreground">All the tools and support included in your Family Wallet.</p>
                </div>
                <ChevronDown className="h-5 w-5 flex-none text-primary transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-7 border-t border-border px-5 py-6 sm:grid-cols-2 sm:px-6">
                {benefitGroups.map(({ icon: Icon, title, items }) => (
                  <div key={title}>
                    <h3 className="flex items-center gap-2 font-semibold text-foreground">
                      <Icon className="h-4 w-4 text-primary" /> {title}
                    </h3>
                    <ul className="mt-3 space-y-2.5">
                      {items.map((item) => (
                        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                          <span className="mt-2 size-1.5 flex-none rounded-full bg-secondary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:px-8 md:grid-cols-2">
          <div>
            <h2 className="heading-display text-xl text-foreground">Opening your wallet</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We send your personal wallet link and short access code. Enter them once and choose
              “Remember this device” to stay signed in for 12 months.
            </p>
          </div>
          <div className="md:border-l md:border-border md:pl-6">
            <h2 className="heading-display text-xl text-foreground">Need your details again?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Message us on WhatsApp or email richard@athletemannies.com and we will resend your link and code.
            </p>
          </div>
        </section>

        <div className="pb-10 text-center">
          <Link
            to="/admin"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Agency sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
