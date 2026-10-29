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

import { FamilyLogin } from "@/components/FamilyLogin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Family Wallet" },
      {
        name: "description",
        content:
          "Every agency family gets a private wallet holding their nanny agreement, nanny CV, membership details, guarantee and everyday nanny tools.",
      },
      { property: "og:title", content: "The Family Wallet" },
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
      "Photo moments & milestones — a private photo diary and milestone journal for your children",
      "First 48 hours — agree routines, pickups and expectations together with a shared parent and nanny checklist",
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
    featured: ["Ask your agency", "Member perks", "Training hub"],
    items: [
      "Ask your agency — message your agency straight from the wallet",
      "Private nanny curation — personally selected profiles, never a public catalogue",
      "VIP Member Perks & London Partner Concierge — private offers and trusted recommendations",
      "Agency Materials — audiobooks, digital books, activity and family guides",
      "Active Kids Sports Passport — skills, challenges and confidence wins",
      "Nanny training hub — safeguarding, routines and emergencies",
      "Nanny training certificate — kept in the wallet once passed",
      "Nanny Fuel — cooking and meal ideas",
      "Nanny activity guide",
    ],
  },
];

const headlineBenefits = [
  { icon: CalendarDays, title: "Everyone sees the same week", detail: "Shifts, school runs and clubs in one shared planner." },
  { icon: Pill, title: "No double-dosing with the medication log", detail: "Every dose timed and signed, so nobody has to text to check." },
  { icon: ReceiptText, title: "A Friday report ready to print", detail: "Hours, activities, handovers and expenses, summed up for you." },
  { icon: Siren, title: "Emergency details always to hand", detail: "Key contacts, allergies and instructions in one tap." },
  { icon: FileText, title: "Your nanny agreement, signed and filed", detail: "Build it, sign it together and keep it safe." },
  { icon: LifeBuoy, title: "Cover when your nanny is off", detail: "Request backup or extra days straight from your phone." },
];


function Index() {
  return (
    <div className="min-h-screen overflow-hidden bg-sand">
      <header className="border-b border-border/70 bg-background/75">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4 sm:px-8">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary font-display text-sm font-semibold text-primary-foreground">
            AM
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">The Family Wallet</p>
            <p className="text-xs text-muted-foreground">For nanny agencies &amp; their families</p>
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

              <div className="mt-4 rounded-2xl border border-secondary/70 bg-background/70 p-5 sm:p-6">
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
                  Step inside a complete sample Family Wallet with no login. Nothing in the demo is live.
                </p>
                <Button asChild variant="outline" size="lg" className="mt-4 w-full border-primary/30 bg-card/70">
                  <Link to="/demo">
                    View the demo wallet <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Link to="/calculator" className="mt-3 flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline">
                  What will a nanny really cost? Try the calculator <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <TodayPreview />
            </div>

            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 lg:px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Inside your Family Wallet</p>
              <h2 className="heading-display mt-2 text-3xl leading-tight text-foreground">
                Everything around your nanny, in one place
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A practical daily home for parents and nannies, backed by ongoing agency support.
              </p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {headlineBenefits.map(({ icon: Icon, title, detail }) => (
                  <li key={title} className="flex gap-3 rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm">
                    <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h3 className="font-semibold leading-snug text-foreground">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>

        <section className="border-y border-border/70 bg-background/65">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <details className="group rounded-2xl bg-card shadow-sm/75">
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
              Contact your agency and they will resend your link and code.
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

const PREVIEW_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PREVIEW_ITEMS = [
  { time: "3:30pm", text: "School pick-up — Jess (nanny shift 3:30–8pm)" },
  { time: "4:30pm", text: "Football training, bring shin pads" },
  { time: "6:00pm", text: "Dinner from Nanny Fuel — chicken traybake" },
];
const PREVIEW_IDEAS = ["1km family run", "Park cricket", "Reading den"];

function TodayPreview() {
  const today = (new Date().getDay() + 6) % 7;
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/80 p-5 sm:p-6" aria-label="Sample calendar preview">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sample preview</p>
      <h2 className="heading-display mt-1 text-xl text-foreground">Today at the Harringtons'</h2>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {PREVIEW_DAYS.map((d, i) => (
          <div key={d} className={`rounded-lg py-2 text-xs font-medium ${i === today ? "bg-primary text-primary-foreground" : i < 5 ? "bg-secondary/60 text-secondary-foreground" : "text-muted-foreground"}`}>
            {d}
          </div>
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {PREVIEW_ITEMS.map((it) => (
          <li key={it.time} className="flex gap-3 text-sm">
            <span className="w-14 flex-none font-semibold text-primary">{it.time}</span>
            <span className="text-foreground/80">{it.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Suggested activities</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PREVIEW_IDEAS.map((a) => (
          <span key={a} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">{a}</span>
        ))}
      </div>
    </div>
  );
}
