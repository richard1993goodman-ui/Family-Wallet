import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Menu } from "lucide-react";

import { Wordmark } from "@/components/brand";
import { FamilyLogin } from "@/components/FamilyLogin";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Family Wallet" },
      {
        name: "description",
        content:
          "Every family gets a private wallet holding their nanny agreement, nanny CV, routines and everyday nanny tools.",
      },
      { property: "og:title", content: "The Family Wallet" },
      {
        property: "og:description",
        content:
          "Your nanny agreement, nanny CV, routines and nanny tools, all in one private link.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const benefitGroups = [
  {
    title: "Today & planning",
    summary: "Every handover, shift and family update in one calm daily view.",
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
    title: "Family & safety",
    summary: "The people, details and safeguards your nanny needs at a glance.",
    items: [
      "Emergency card — key contacts and instructions at a glance",
      "House Manual & Codes — WiFi, alarm and lockbox codes, utilities, house rules, bin days and appliances",
      "Kids' Playbook — quirks and comforts, how we handle big moments, friends and rainy-day ideas",
      "Your nanny's CV, profile and references",
      "Checks & credentials — DBS, ID and right to work",
      "Know my family — children's profiles and the nanny quick guide",
      "Medication log — timestamped doses so nobody double-doses",
      "Photo moments & milestones — a private photo diary and milestone journal",
      "First 48 hours — routines, pickups and expectations agreed together",
      "Insurance & safeguarding record — check, training and cover status",
    ],
  },
  {
    title: "Agreement & employment",
    summary: "Your working arrangement, pay tools and key documents together.",
    items: [
      "Your nanny agreement",
      "Managed Nannytax setup — a guided introduction and visible next steps",
      "All-in employment cost calculator — pay, NI, pension and payroll estimates",
      "Your Nannytax referral code",
      "Agency terms and conditions",
      "Reviews & check-ins — 6-month and yearly conversation guides",
    ],
  },
  {
    title: "Support & extras",
    summary: "Trusted ideas and thoughtful extras that make family life easier.",
    items: [
      "Messages — topic conversations between family and nanny",
      "Private nanny curation — personally selected profiles, never a public catalogue",
      "Family perks & London Partner Concierge — private offers and trusted recommendations",
      "Agency Materials — audiobooks, digital books, activity and family guides",
      "Active Kids Sports Passport — skills, challenges and confidence wins",
      "Nanny training hub — safeguarding, routines and emergencies",
      "Nanny training certificate — kept in the wallet once passed",
      "Nanny Fuel — cooking and meal ideas",
      "Nanny activity guide",
    ],
  },
];

const weekClaims = [
  {
    title: "Everyone sees the same week",
    detail: "Shifts sync from the nanny agreement; school runs and clubs sit beside them.",
  },
  {
    title: "No double-dosing",
    detail: "Every dose of medicine is timed and signed, so nobody has to text to check.",
  },
  {
    title: "A Friday report, ready to print",
    detail: "Hours, activities, handovers and expenses, summed up for you.",
  },
  {
    title: "Petty cash that adds up",
    detail: "Top-ups and receipts logged, so everyone knows what is left in the float.",
  },
];

const credits = [
  {
    title: "28–31 Brompton Square, South Kensington",
    by: "No Swan So Fine",
    licence: "CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:28-31_Brompton_Square,_South_Kensington,_July_2023.jpg",
  },
  {
    title: "Holland Park, April 2026",
    by: "The wub",
    licence: "CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/w/index.php?curid=189002899",
  },
  {
    title: "Pushkin House fanlight",
    by: "Pushkin House Rafy",
    licence: "CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:Pushkin_House_fanlight.jpg",
  },
  {
    title: "8, 9 and 10 North Terrace, South Kensington",
    by: "No Swan So Fine",
    licence: "CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:8,_9_and_10_North_Terrace,_South_Kensington,_July_2023.jpg",
  },
];

const navLinks = [
  { href: "#week", label: "How it works" },
  { href: "#included", label: "What's inside" },
] as const;

function splitItem(item: string) {
  const [name, ...rest] = item.split(" — ");
  const detail = rest.join(" — ");
  return { name, detail: detail ? detail[0]!.toUpperCase() + detail.slice(1) : undefined };
}

/** One frame for every section: 32px margins, 1280px measure. */
const frame = "mx-auto w-full max-w-[84rem] px-4 sm:px-8";

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className={cn(frame, "flex h-16 items-center justify-between gap-6")}>
        <Link to="/" aria-label="The Family Wallet, home">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-7 text-[0.9375rem] md:flex">
          {navLinks.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {n.label}
            </a>
          ))}
          <Link
            to="/demo"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Demo
          </Link>
          <Link
            to="/calculator"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Cost calculator
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button className="hidden sm:inline-flex" asChild>
            <a href="#sign-in">Open my wallet</a>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="heading-serif text-xl font-normal">
                  The Family Wallet
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-1">
                {navLinks.map((n) => (
                  <Button key={n.href} variant="ghost" className="justify-start" asChild>
                    <a href={n.href}>{n.label}</a>
                  </Button>
                ))}
                <Button variant="ghost" className="justify-start" asChild>
                  <Link to="/demo">Demo wallet</Link>
                </Button>
                <Button variant="ghost" className="justify-start" asChild>
                  <Link to="/calculator">Cost calculator</Link>
                </Button>
                <Separator className="my-3" />
                <Button asChild>
                  <a href="#sign-in">Open my wallet</a>
                </Button>
                <Button variant="outline" className="mt-2" asChild>
                  <Link to="/admin">Agency sign in</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function Index() {
  useReveal();

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <SiteHeader />

      <main>
        {/* The front door: what this is, and the way in */}
        <section className={cn(frame, "pb-24 pt-8 md:pt-12 lg:pb-36")}>
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7 lg:pr-6" data-reveal>
              <h1 className="heading-serif text-balance text-[2.75rem] leading-[1.02] text-foreground sm:text-[4rem] lg:text-[5rem]">
                Family and nanny, one wallet
              </h1>
              <p className="mt-8 max-w-[34rem] text-pretty text-lg leading-relaxed text-foreground sm:text-xl">
                A private home your agency sets up for each household. The week, the nanny
                agreement, the house codes and every handover sit behind one link and a
                six-character code.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Button size="lg" asChild>
                  <Link to="/demo">
                    Explore the demo wallet <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                The demo is the Harrington family and their nanny Jess. Nothing in it is live.
              </p>
            </div>

            <div className="relative lg:col-span-5" data-reveal>
              <figure className="relative overflow-hidden bg-muted">
                <img
                  src="/images/london/brompton-square.jpg"
                  alt="White stucco townhouses on Brompton Square, South Kensington, under a plane tree"
                  className="hero-drift aspect-[4/3] w-full object-cover lg:aspect-[4/5]"
                  fetchPriority="high"
                />
              </figure>
              <div className="mt-4 sm:absolute sm:bottom-6 sm:left-6 sm:mt-0 sm:w-[25rem]">
                <FamilyLogin
                  className="border-transparent"
                  footer={
                    <p className="text-center text-[0.8125rem] text-muted-foreground">
                      Lost your details?{" "}
                      <a
                        href="#help"
                        className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
                      >
                        Ask your agency
                      </a>{" "}
                      ·{" "}
                      <Link to="/admin" className="underline-offset-4 hover:underline">
                        Agency sign in
                      </Link>
                    </p>
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* The week, as the household sees it */}
        <section id="week" className="scroll-mt-16 bg-card py-24 lg:py-36">
          <div className={cn(frame, "grid gap-14 lg:grid-cols-12 lg:gap-8")}>
            <div className="lg:col-span-5" data-reveal>
              <h2 className="heading-serif text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl">
                A week at the Harringtons'
              </h2>
              <p className="mt-6 max-w-[30rem] text-lg leading-relaxed text-foreground">
                Parents and nanny open the same wallet. The agreed hours, the school run and what
                happened today are already there when either of you looks.
              </p>
              <dl className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {weekClaims.map((claim) => (
                  <div key={claim.title} data-reveal>
                    <dt className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
                      {claim.title}
                    </dt>
                    <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">
                      {claim.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="lg:col-span-7 lg:pl-8" data-reveal>
              <WeekPreview />
            </div>
          </div>
        </section>

        <figure className="relative">
          <img
            src="/images/london/holland-park-morning.jpg"
            alt="A tree-lined Holland Park street in low morning sun"
            className="aspect-[4/5] w-full object-cover sm:aspect-[21/9]"
            loading="lazy"
          />
          <figcaption className={cn(frame, "mt-3 text-[0.8125rem] text-muted-foreground")}>
            Holland Park, early morning. The school run starts at 8:10.
          </figcaption>
        </figure>

        {/* Everything in the wallet, set as an index */}
        <section id="included" className="scroll-mt-16 py-24 lg:py-36">
          <div className={frame}>
            <div className="grid gap-6 lg:grid-cols-12 lg:gap-8" data-reveal>
              <h2 className="heading-serif text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl lg:col-span-6">
                Everything in the wallet
              </h2>
              <p className="max-w-[32rem] text-lg leading-relaxed text-foreground lg:col-span-5 lg:col-start-8 lg:self-end">
                {benefitGroups.reduce((n, g) => n + g.items.length, 0)} tools in four drawers, set
                up by your agency and shared only with the people in your household.
              </p>
            </div>

            <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-4">
              {benefitGroups.map((group) => (
                <div key={group.title} data-reveal>
                  <div className="border-t-2 border-foreground pt-5">
                    <h3 className="flex items-baseline justify-between gap-3 text-xl font-semibold tracking-[-0.015em] text-foreground">
                      {group.title}
                      <span className="num text-[0.9375rem] font-normal text-muted-foreground">
                        {group.items.length}
                      </span>
                    </h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
                      {group.summary}
                    </p>
                  </div>
                  <ul className="mt-6 space-y-4">
                    {group.items.map((raw) => {
                      const { name, detail } = splitItem(raw);
                      return (
                        <li key={raw} className="text-[0.9375rem] leading-snug">
                          <p className="font-medium text-foreground">{name}</p>
                          {detail && <p className="mt-0.5 text-muted-foreground">{detail}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Codes stay behind the door */}
        <section className="bg-card py-24 lg:py-36">
          <div className={cn(frame, "grid items-start gap-12 lg:grid-cols-12 lg:gap-8")}>
            <figure className="lg:col-span-12" data-reveal>
              <img
                src="/images/london/fanlight.jpg"
                alt="A Georgian fanlight in a white stucco arch"
                className="aspect-[3/1] w-full object-cover object-[50%_18%]"
                loading="lazy"
              />
            </figure>
            <div className="lg:col-span-5" data-reveal>
              <h2 className="heading-serif text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl">
                Codes stay behind the door
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-foreground">
                The alarm, the lockbox and the WiFi live in the House Manual, hidden until someone
                in your household taps to reveal them. They are never sent in a message or saved on
                a phone.
              </p>
            </div>
            <div className="lg:col-span-6 lg:col-start-7" data-reveal>
              <HouseCodes />
            </div>
          </div>
        </section>

        {/* The way in */}
        <section
          id="help"
          className="scroll-mt-16 bg-primary py-24 text-primary-foreground lg:py-32"
        >
          <div className={cn(frame, "grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-8")}>
            <div className="lg:col-span-5" data-reveal>
              <h2 className="heading-serif text-balance text-[2.25rem] leading-[1.08] sm:text-5xl">
                Opening your wallet
              </h2>
              <ol className="mt-10 space-y-7">
                {[
                  [
                    "Your agency sends two things",
                    "A personal wallet link and a six-character access code.",
                  ],
                  [
                    "Enter them once",
                    "On your phone or computer, in the form at the top of this page.",
                  ],
                  [
                    "Choose Remember this device",
                    "You stay signed in on that device for 12 months.",
                  ],
                ].map(([title, detail]) => (
                  <li key={title} className="border-l border-white/25 pl-5">
                    <p className="text-[1.0625rem] font-medium">{title}</p>
                    <p className="mt-1 text-[0.9375rem] leading-relaxed text-white/70">{detail}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-11 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Button size="lg" className="bg-white text-foreground hover:bg-white/90" asChild>
                  <a href="#sign-in">
                    Open my wallet <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <p className="text-[0.9375rem] text-white/70">
                  Need your details again? Your agency resends them.{" "}
                  <Link to="/admin" className="text-white underline underline-offset-4">
                    Agency sign in
                  </Link>
                </p>
              </div>
            </div>
            <figure className="lg:col-span-6 lg:col-start-7" data-reveal>
              <img
                src="/images/london/north-terrace.jpg"
                alt="Arched front doors and black railings on North Terrace, South Kensington"
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
            </figure>
          </div>
        </section>
      </main>

      <footer className="pb-10 pt-20">
        <div className={frame}>
          <p className="heading-serif whitespace-nowrap text-[11.4vw] leading-[0.9] tracking-[-0.025em] text-foreground min-[84rem]:text-[10.25rem]">
            The Family Wallet
          </p>
          <div className="mt-12 flex flex-col justify-between gap-6 text-[0.9375rem] text-muted-foreground md:flex-row">
            <nav className="flex flex-wrap gap-x-7 gap-y-2">
              <Link to="/demo" className="transition-colors hover:text-foreground">
                Demo wallet
              </Link>
              <Link to="/calculator" className="transition-colors hover:text-foreground">
                Cost calculator
              </Link>
              <Link to="/admin" className="transition-colors hover:text-foreground">
                Agency sign in
              </Link>
            </nav>
            <p>© {new Date().getFullYear()} The Family Wallet</p>
          </div>
          <p className="mt-8 max-w-4xl text-xs leading-relaxed text-muted-foreground">
            Photographs:{" "}
            {credits.map((c, i) => (
              <span key={c.href}>
                <a href={c.href} className="underline underline-offset-2 hover:text-foreground">
                  {c.title}
                </a>{" "}
                by {c.by}, {c.licence}, via Wikimedia Commons
                {i < credits.length - 1 ? "; " : "."}
              </span>
            ))}
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ---------------- The live week: a real piece of the wallet ---------------- */

type PreviewDay = {
  short: string;
  date: number;
  shift: [number, number] | null;
  items: Array<{ time: string; title: string; who?: string }>;
};

const PREVIEW_WEEK: PreviewDay[] = [
  {
    short: "Mon",
    date: 2,
    shift: [7.5, 18.5],
    items: [
      { time: "08:10", title: "School run, Holland Park Primary", who: "Olivia" },
      { time: "16:00", title: "Swimming, Kensington Leisure Centre", who: "Arthur" },
    ],
  },
  {
    short: "Tue",
    date: 3,
    shift: [7.5, 18.5],
    items: [
      { time: "08:10", title: "School run", who: "Olivia" },
      { time: "17:30", title: "Calpol 5ml, signed by Jess", who: "Olivia" },
    ],
  },
  {
    short: "Wed",
    date: 4,
    shift: [12, 19],
    items: [
      { time: "15:15", title: "Pick-up, bring the reading folder", who: "Olivia" },
      { time: "16:30", title: "Football training, shin pads", who: "Arthur" },
      { time: "18:00", title: "Dinner from Nanny Fuel: chicken traybake" },
    ],
  },
  {
    short: "Thu",
    date: 5,
    shift: [7.5, 18.5],
    items: [{ time: "10:00", title: "Playdate with the Ashworths", who: "Arthur" }],
  },
  {
    short: "Fri",
    date: 6,
    shift: [7.5, 15],
    items: [
      { time: "14:30", title: "Friday report sent to Sophie and Tom" },
      { time: "15:00", title: "Handover at the door" },
    ],
  },
  { short: "Sat", date: 7, shift: null, items: [] },
  { short: "Sun", date: 8, shift: null, items: [] },
];

const TRACK_START = 7;
const TRACK_HOURS = 14;
const clock = (h: number) =>
  `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

function WeekPreview() {
  const [selected, setSelected] = useState(2);
  const day = PREVIEW_WEEK[selected]!;
  const hours = PREVIEW_WEEK.reduce((n, d) => n + (d.shift ? d.shift[1] - d.shift[0] : 0), 0);

  return (
    <div data-ui className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-serif text-[0.9375rem] text-brand">
            J
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Jess Okafor</p>
            <p className="num text-[0.8125rem] text-muted-foreground">
              {hours} hours agreed this week
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">2–8 November</p>
      </div>

      <div
        className="grid grid-cols-7 gap-1 px-3 pt-4 sm:gap-1.5 sm:px-5"
        role="group"
        aria-label="Choose a day"
      >
        {PREVIEW_WEEK.map((d, i) => {
          const isSelected = i === selected;
          const span = d.shift
            ? {
                top: ((d.shift[0] - TRACK_START) / TRACK_HOURS) * 100,
                height: ((d.shift[1] - d.shift[0]) / TRACK_HOURS) * 100,
              }
            : null;
          return (
            <button
              key={d.short}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={isSelected}
              aria-label={`${d.short} ${d.date} November${d.shift ? `, Jess ${clock(d.shift[0])} to ${clock(d.shift[1])}` : ", no shift"}`}
              className={cn(
                "flex min-h-[9.5rem] cursor-pointer flex-col items-center rounded-md px-1 pb-3 pt-3 transition-colors",
                isSelected ? "bg-accent" : "hover:bg-raised",
              )}
            >
              <span className="text-xs text-muted-foreground">{d.short}</span>
              <span
                className={cn(
                  "num mt-1 flex h-8 w-8 items-center justify-center rounded-full text-base",
                  i === 2 ? "bg-brand font-medium text-brand-foreground" : "text-foreground",
                )}
              >
                {d.date}
              </span>
              <span className="relative mt-3 h-16 w-2 overflow-hidden rounded-full bg-muted">
                {span && (
                  <span
                    className="absolute inset-x-0 rounded-full bg-brand transition-[top,height] duration-300"
                    style={{ top: `${span.top}%`, height: `${span.height}%` }}
                  />
                )}
              </span>
              <span
                className={cn(
                  "num mt-2.5 text-[11px] leading-tight",
                  d.shift ? "text-foreground" : "text-muted-foreground/70",
                )}
              >
                {d.shift ? `${clock(d.shift[0])}–${clock(d.shift[1])}` : "Off"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-rule px-5 py-5 sm:px-6" aria-live="polite">
        <p className="text-sm font-medium text-foreground">
          {day.short === "Wed" ? "Today" : `${day.short} ${day.date} November`}
          {day.shift && (
            <span className="num font-normal text-muted-foreground">
              {" "}
              · Jess {clock(day.shift[0])}–{clock(day.shift[1])}
            </span>
          )}
        </p>
        <ul className="mt-3 min-h-[6.75rem] space-y-2.5">
          {day.items.length === 0 && (
            <li className="text-sm text-muted-foreground">
              A family weekend. Nothing planned in the wallet.
            </li>
          )}
          {day.items.map((item) => (
            <li key={item.time + item.title} className="flex gap-4 text-sm">
              <span className="num w-12 flex-none text-muted-foreground">{item.time}</span>
              <span className="min-w-0 text-foreground">
                {item.title}
                {item.who && <span className="text-muted-foreground"> · {item.who}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Tap to reveal: the House Manual's codes ---------------- */

const SAMPLE_CODES = [
  { label: "Front door lockbox", value: "4719" },
  { label: "Alarm", value: "2086 then Set" },
  { label: "WiFi · Harrington-Home", value: "plane-tree-31" },
];

function HouseCodes({ className }: { className?: string }) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(null), 6000);
    return () => window.clearTimeout(timer);
  }, [shown]);

  return (
    <div data-ui className={cn("rounded-lg border border-border bg-background", className)}>
      {SAMPLE_CODES.map((code, i) => {
        const visible = shown === code.label;
        return (
          <div
            key={code.label}
            className={cn(
              "flex items-center justify-between gap-4 px-4 py-3",
              i > 0 && "border-t border-rule",
            )}
          >
            <div className="min-w-0">
              <p className="text-[0.8125rem] text-muted-foreground">{code.label}</p>
              <p className="num mt-0.5 truncate font-mono text-[0.9375rem] text-foreground">
                {visible ? code.value : "• • • •"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShown(visible ? null : code.label)}
              aria-label={`${visible ? "Hide" : "Reveal"} ${code.label}`}
            >
              {visible ? <EyeOff /> : <Eye />}
              {visible ? "Hide" : "Reveal"}
            </Button>
          </div>
        );
      })}
      <p className="border-t border-rule px-4 py-2.5 text-xs text-muted-foreground">
        Sample codes from the demo household. Each one hides again after six seconds.
      </p>
    </div>
  );
}
