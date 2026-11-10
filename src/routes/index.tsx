import { onMailtoClick } from "@/lib/mailto";
import { CONTACT_EMAIL } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUp,
  ClipboardCheck,
  Clock3,
  Eye,
  EyeOff,
  FileBarChart,
  Mail,
  Menu,
  MessageCircle,
  Pause,
  Pill,
  Play,
} from "lucide-react";

import { WalletHero } from "@/components/WalletShowcase";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";
import { organizationLd, pageHead, softwareLd, websiteLd } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "Family Wallet: Nanny & Household Staff Management App",
      description:
        "A private app for families who employ a nanny, au pair or household staff. Shared week, signed agreement, daily log, timesheets and house codes in one place.",
      path: "/",
      jsonLd: [
        organizationLd(),
        websiteLd(),
        softwareLd([
          { name: "Family", price: "9.99", description: "One nanny or au pair, billed monthly, excluding VAT." },
          { name: "Household", price: "19.99", description: "Up to six staff, billed monthly, excluding VAT." },
        ]),
      ],
    }),
  component: Index,
});

const benefitGroups = [
  {
    title: "Today & planning",
    summary: "Every handover, shift and family update in one calm daily view.",
    photo: { src: "/images/kids/tennis.jpg", alt: "A child in a white t-shirt seen from behind on a clay tennis court, resting a racket by their side" },
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
    photo: { src: "/images/kids/artwork.jpg", alt: "A wall of children's rainbow, sun and sunset paintings pinned up side by side" },
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
    photo: { src: "/images/kids/rainbow-craft.jpg", alt: "A child's hand pressing torn coloured paper onto a rainbow outline" },
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
    photo: { src: "/images/kids/chef.jpg", alt: "A toddler in a chef's hat and apron stirring an empty pan in a bright kitchen" },
    items: [
      "Messages — topic conversations between family and nanny",
      "Phone alerts — parents are notified when notes, photos, key information, schedule changes or holiday requests are added, with quiet hours",
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
    title: "You're told the moment anything changes",
    detail: "When your nanny, au pair or household staff add notes, photos or key information, or ask to change the schedule or book holiday, you get an alert. Nothing private shows on the lock screen.",
  },
  {
    title: "Alerts you control",
    detail: "Choose what buzzes and set quiet hours on each phone, so a wallet never becomes noise.",
  },
  {
    title: "Petty cash that adds up",
    detail: "Top-ups and receipts logged, so everyone knows what is left in the float.",
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
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-300",
        scrolled ? "material border-border/70" : "border-transparent bg-background",
      )}
    >
      <div className={cn(frame, "flex h-16 items-center justify-between gap-6")}>
        <Link to="/" aria-label="The Family Wallet, home" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="heading-serif text-[1.375rem] leading-none text-foreground">
            The Family Wallet
          </span>
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
            to="/pricing"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            to="/demo"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Demo
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button className="hidden sm:inline-flex" asChild>
            <Link to="/login">Open my wallet</Link>
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
                  <Button
                    key={n.href}
                    variant="ghost"
                    className="h-11 justify-start text-[0.9375rem]"
                    asChild
                  >
                    <a href={n.href}>{n.label}</a>
                  </Button>
                ))}
                <Button variant="ghost" className="h-11 justify-start text-[0.9375rem]" asChild>
                  <Link to="/pricing">Pricing</Link>
                </Button>
                <Button variant="ghost" className="h-11 justify-start text-[0.9375rem]" asChild>
                  <Link to="/demo">Demo wallet</Link>
                </Button>
                <Separator className="my-3" />
                <Button className="h-11" asChild>
                  <Link to="/login">Open my wallet</Link>
                </Button>
                <Button variant="outline" className="mt-2 h-11" asChild>
                  <Link to="/admin">Agency sign in</Link>
                </Button>
                <Button variant="outline" className="mt-2 h-11" asChild>
                  <a href={`mailto:${CONTACT_EMAIL}`} onClick={onMailtoClick}>
                    <Mail className="mr-2 h-4 w-4" />
                    Contact support
                  </a>
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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2.5 focus:text-sm focus:text-background"
      >
        Skip to content
      </a>
      <SiteHeader />

      <main id="main" tabIndex={-1} className="outline-none">
        {/* The front door is the wallet itself: a phone you can spin and tap, driven by the page */}
        <WalletHero />

        <figure className={cn(frame, "pb-8 pt-2 lg:pb-12 lg:pt-4")} data-reveal>
          <img
            src="/images/kids/camera.jpg"
            alt="A toddler in a striped top sitting in a red booster seat, holding a purple toy camera up to one eye"
            width={1600}
            height={1106}
            className="aspect-[4/3] w-full rounded-lg object-cover object-[58%_45%] sm:aspect-[3/1] sm:object-[50%_48%]"
            loading="lazy"
          />
        </figure>

        {/* The week, as the household sees it: live pieces of the wallet, set as a bento */}
        <section id="week" className="scroll-mt-16 bg-card py-24 lg:py-32">
          <div className={frame}>
            <div className="grid gap-6 lg:grid-cols-12 lg:gap-8" data-reveal>
              <h2 className="heading-serif text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl lg:col-span-6">
                A week at the Harringtons'
              </h2>
              <p className="max-w-[32rem] text-lg leading-relaxed text-foreground lg:col-span-5 lg:col-start-8 lg:self-end">
                Parents and nanny open the same wallet. The agreed hours, the school run and what
                happened today are already there when either of you looks.
              </p>
            </div>

            <div className="mt-14 grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7" data-reveal>
                <WeekPreview />
              </div>

              <div className="rounded-lg bg-secondary p-6 sm:p-8 lg:col-span-5" data-reveal>
                <h3 className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-foreground">
                  Codes stay behind the door
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
                  Hidden in the House Manual until someone in your household taps to reveal them.
                  Never sent in a message or saved on a phone.
                </p>
                <HouseCodes className="mt-6" />
              </div>

              <figure
                className="relative aspect-[2/1] overflow-hidden rounded-lg bg-muted lg:col-span-5 lg:aspect-auto lg:min-h-64"
                data-reveal
              >
                <img
                  src="/images/london/colouring.jpg"
                  alt="Two children colouring in Easter pictures with felt-tip pens at a table in the sun"
                  width={1600}
                  height={960}
                  className="absolute inset-0 h-full w-full object-cover object-[45%_50%]"
                  loading="lazy"
                />
              </figure>

              <dl
                className="grid gap-x-10 gap-y-8 rounded-lg border border-border p-6 sm:grid-cols-2 sm:p-8 lg:col-span-7"
                data-reveal
              >
                {weekClaims.map((claim) => (
                  <div key={claim.title}>
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
          </div>
        </section>

        <figure className={cn(frame, "pt-4 lg:pt-8")}>
          <img
            src="/images/kids/school-run.jpg"
            alt="A line of children in sun hats and bright backpacks walking away from the camera on the school run"
            width={1600}
            height={1252}
            className="aspect-[4/3] w-full rounded-lg object-cover object-[68%_45%] sm:aspect-[3/1] sm:object-[50%_40%]"
            loading="lazy"
          />
          <figcaption className="mt-3 text-[0.8125rem] text-muted-foreground">
            The school run, on foot. Every handover goes in the wallet.
          </figcaption>
        </figure>

        {/* One day, scrubbed through as the wallet records it */}
        <DayScrubber />

        {/* Everything in the wallet, set as an index */}
        <section id="included" className="scroll-mt-16 py-24 lg:py-36">
          <div className={frame}>
            <div className="grid gap-6 lg:grid-cols-12 lg:gap-8" data-reveal>
              <h2 className="heading-serif text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl lg:col-span-6">
                Everything in the wallet
              </h2>
              <p className="max-w-[32rem] text-lg leading-relaxed text-foreground lg:col-span-5 lg:col-start-8 lg:self-end">
                {benefitGroups.reduce((n, g) => n + g.items.length, 0)} tools in four drawers, ready
                in minutes and shared only with the people in your household.
              </p>
            </div>

            <DrawerSwitcher />
          </div>
        </section>

        {/* The way in */}
        <section id="help" className="scroll-mt-16 bg-ink-band py-24 text-white lg:py-32">
          <div className={cn(frame, "grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-8")}>
            <div className="lg:col-span-5" data-reveal>
              <h2 className="heading-serif text-balance text-[2.25rem] leading-[1.08] sm:text-5xl">
                Opening your wallet
              </h2>
              <ol className="mt-10 space-y-7">
                {[
                  [
                    "Subscribing directly?",
                    "Pick a plan on our pricing page. Your private wallet link and access code are created straight away and emailed to you.",
                  ],
                  [
                    "Joined through an agency?",
                    "Open the private link and six-character code sent by your agency team.",
                  ],
                  [
                    "Enter once and save",
                    "Choose Remember this device to stay signed in for 12 months.",
                  ],
                ].map(([title, detail]) => (
                  <li key={title} className="border-l border-white/25 pl-5">
                    <p className="text-[1.0625rem] font-medium">{title}</p>
                    <p className="mt-1 text-[0.9375rem] leading-relaxed text-white/70">{detail}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-11 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Button size="lg" className="bg-white text-ink-band hover:bg-white/90" asChild>
                  <Link to="/login">
                    Open my wallet <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-[0.9375rem] text-white/70">
                  New here?{" "}
                  <Link to="/pricing" className="text-white underline underline-offset-4">
                    See plans
                  </Link>
                  . Through an agency?{" "}
                  <Link to="/admin" className="text-white underline underline-offset-4">
                    Agency sign in
                  </Link>
                </p>
              </div>
            </div>
            <figure className="lg:col-span-6 lg:col-start-7" data-reveal>
              <img
                src="/images/kids/paint-sticks.jpg"
                alt="A toddler in profile drawing coloured circles on paper with chunky paint sticks"
                width={1400}
                height={1050}
                className="aspect-[4/3] w-full rounded-2xl object-cover"
                loading="lazy"
              />
            </figure>
          </div>
        </section>
      </main>

      <FloatingDemoBar />
      <BackToTop />

      <footer id="site-footer" className="pb-10 pt-20">
        <div className={frame}>
          <p className="heading-serif whitespace-nowrap text-[11.4vw] leading-[0.9] tracking-[-0.025em] text-foreground min-[84rem]:text-[10.25rem]">
            The Family Wallet
          </p>
          <div className="mt-12 flex flex-col justify-between gap-6 text-[0.9375rem] text-muted-foreground md:flex-row">
            <nav className="flex flex-wrap gap-x-7 gap-y-2">
              <Link to="/pricing" className="transition-colors hover:text-foreground">
                Pricing
              </Link>
              <Link to="/nanny-management-app" className="transition-colors hover:text-foreground">
                Nanny app
              </Link>
              <Link to="/household-staff-app" className="transition-colors hover:text-foreground">
                Household staff
              </Link>
              <Link to="/for-agencies" className="transition-colors hover:text-foreground">
                For agencies
              </Link>
              <Link to="/guides" className="transition-colors hover:text-foreground">
                Guides
              </Link>
              <Link to="/demo" className="transition-colors hover:text-foreground">
                Demo wallet
              </Link>
              <Link to="/admin" className="transition-colors hover:text-foreground">
                Agency sign in
              </Link>
            </nav>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>© {new Date().getFullYear()} The Family Wallet</span>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                onClick={onMailtoClick}
                className="text-[0.8125rem] underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Contact support
              </a>
            </p>
          </div>
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

/* ---------------- One Wednesday: a scroll story with a pinned wallet card ---------------- */

function StoryCard({
  icon: Icon,
  label,
  meta,
  children,
}: {
  icon: typeof Clock3;
  label: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-ui
      className="w-full max-w-[26rem] overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center gap-2.5 border-b border-rule px-5 py-3.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{label}</p>
        {meta && <p className="num ml-auto text-[0.8125rem] text-muted-foreground">{meta}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function LedgerRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="divide-y divide-rule text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="num text-right font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const WEDNESDAY = PREVIEW_WEEK[2]!;
const WEEK_HOURS = PREVIEW_WEEK.reduce((n, d) => n + (d.shift ? d.shift[1] - d.shift[0] : 0), 0);

const STORY: Array<{ time: string; title: string; detail: string; card: ReactNode }> = [
  {
    time: "12:00",
    title: "Jess starts at noon",
    detail:
      "Her shift and the afternoon are waiting on the home screen: pick-up at 15:15, football at 16:30, dinner at six.",
    card: (
      <StoryCard icon={Clock3} label="Your shift today" meta="Wed 4 Nov">
        <p className="num heading-display text-[1.75rem] text-foreground">
          {clock(WEDNESDAY.shift![0])}–{clock(WEDNESDAY.shift![1])}
        </p>
        <ul className="mt-4 space-y-2.5 border-t border-rule pt-4">
          {WEDNESDAY.items.map((item) => (
            <li key={item.time} className="flex gap-4 text-sm">
              <span className="num w-12 flex-none text-muted-foreground">{item.time}</span>
              <span className="text-foreground">
                {item.title}
                {item.who && <span className="text-muted-foreground"> · {item.who}</span>}
              </span>
            </li>
          ))}
        </ul>
      </StoryCard>
    ),
  },
  {
    time: "14:58",
    title: "A message, not a phone call",
    detail:
      "Sophie leaves a note about the reading folder. Jess answers from the school gate, and both parents can read the thread.",
    card: (
      <StoryCard icon={MessageCircle} label="School run" meta="2 messages">
        <div className="space-y-3 text-sm">
          <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-accent px-3.5 py-2.5">
            <p className="text-foreground">
              Reading folder is on the hall table, and Arthur's shin pads are by the door.
            </p>
            <p className="num mt-1 text-xs text-muted-foreground">Sophie · 14:52</p>
          </div>
          <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-primary-foreground">
            <p>Got both. Leaving for school now.</p>
            <p className="num mt-1 text-xs text-primary-foreground/60">Jess · 14:58</p>
          </div>
        </div>
      </StoryCard>
    ),
  },
  {
    time: "17:30",
    title: "Calpol, timed and signed",
    detail:
      "Olivia has a temperature. The dose goes into the medication log with the time and Jess's name, so nobody gives a second one by mistake.",
    card: (
      <StoryCard icon={Pill} label="Medication log" meta="Olivia">
        <p className="heading-display text-xl text-foreground">Calpol 5ml</p>
        <div className="mt-4">
          <LedgerRows
            rows={[
              ["Given", "17:30 by Jess"],
              ["Next dose from", "21:30"],
              ["Reason", "Temperature"],
            ]}
          />
        </div>
      </StoryCard>
    ),
  },
  {
    time: "19:00",
    title: "Handover at the door",
    detail:
      "Homework, dinner, mood and tomorrow's kit, written up before Jess leaves. Tom reads it on the way home.",
    card: (
      <StoryCard icon={ClipboardCheck} label="End-of-day handover" meta="19:00">
        <LedgerRows
          rows={[
            ["Homework", "Reading done, spellings Thursday"],
            ["Dinner", "Chicken traybake, ate well"],
            ["Mood", "Happy, tired after football"],
            ["Tomorrow", "Swimming kit for Olivia"],
          ]}
        />
      </StoryCard>
    ),
  },
  {
    time: "Friday",
    title: "The week, summed up",
    detail: "Hours, handovers and expenses add up on their own into a report Sophie can print.",
    card: (
      <StoryCard icon={FileBarChart} label="Weekly report" meta="2–8 November">
        <LedgerRows
          rows={[
            ["Hours worked", `${WEEK_HOURS} hours`],
            ["Handovers", "5 of 5"],
            ["Medicine doses", "1, signed"],
            ["Expenses to repay", "£38.40"],
          ]}
        />
      </StoryCard>
    ),
  },
];

/** Which step of Wednesday the visitor's own clock falls in, so each visit opens somewhere real. */
function stepForClock(date: Date) {
  const h = date.getHours() + date.getMinutes() / 60;
  return h < 14 + 58 / 60 ? 0 : h < 17.5 ? 1 : h < 19 ? 2 : 3;
}

function DayScrubber() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [localTime, setLocalTime] = useState<string | null>(null);
  const step = STORY[active]!;
  const last = STORY.length - 1;

  useEffect(() => {
    const now = new Date();
    setActive(stepForClock(now));
    setLocalTime(now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (active === last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setActive(active + 1), 3200);
    return () => window.clearTimeout(timer);
  }, [playing, active, last]);

  function go(i: number) {
    setPlaying(false);
    setActive(i);
  }

  function togglePlay() {
    if (!playing && active === last) setActive(0);
    setPlaying(!playing);
  }

  return (
    <section id="day" className="scroll-mt-16 py-24 lg:py-32">
      <div className={frame}>
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8" data-reveal>
          <h2 className="heading-serif text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl lg:col-span-6">
            One Wednesday, start to finish
          </h2>
          <p className="max-w-[32rem] text-lg leading-relaxed text-foreground lg:col-span-5 lg:col-start-8 lg:self-end">
            Jess works noon to seven. Move through her afternoon and see each moment land in the
            wallet, the way Sophie and Tom see it.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl bg-secondary" data-reveal>
          <div className="grid lg:grid-cols-12">
            <div className="p-7 sm:p-10 lg:col-span-5 lg:p-12">
              <p
                aria-hidden
                className="num heading-display text-[4.5rem] leading-none tracking-[-0.03em] text-brand sm:text-[6rem]"
              >
                {step.time}
              </p>
              <div
                key={active}
                aria-live="polite"
                className="mt-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ease-out motion-reduce:animate-none"
              >
                <h3 className="text-[1.625rem] font-semibold leading-tight tracking-[-0.02em] text-foreground">
                  <span className="sr-only">{step.time}: </span>
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[28rem] text-lg leading-relaxed text-foreground">
                  {step.detail}
                </p>
              </div>
            </div>

            {/* Every card shares one grid cell, so the stage is as tall as the tallest card. */}
            <div className="grid place-items-center px-5 pb-10 sm:px-10 lg:col-span-7 lg:py-12">
              {STORY.map((s, i) => (
                <div
                  key={s.title}
                  aria-hidden={active !== i}
                  className={cn(
                    "flex w-full justify-center [grid-area:1/1] transition-[opacity,transform,filter,visibility] ease-out motion-reduce:transition-none",
                    // Arrive slowly, leave quickly, so the two cards barely overlap.
                    active === i
                      ? "translate-y-0 opacity-100 blur-0 duration-500"
                      : "pointer-events-none invisible translate-y-4 opacity-0 blur-[6px] duration-200",
                  )}
                >
                  {s.card}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-4 border-t border-rule px-5 py-5 sm:gap-6 sm:px-10 lg:px-12">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={togglePlay}
              aria-label={playing ? "Pause the day" : "Play the day"}
              className="size-11 flex-none rounded-full bg-card"
            >
              {playing ? <Pause /> : <Play />}
            </Button>
            <div className="min-w-0 flex-1">
              <input
                type="range"
                min={0}
                max={last}
                step={1}
                value={active}
                onChange={(e) => go(Number(e.target.value))}
                onPointerDown={() => setPlaying(false)}
                aria-label="Time of day"
                aria-valuetext={`${step.time}, ${step.title}`}
                className="h-11 w-full cursor-pointer accent-brand"
              />
              <div aria-hidden className="flex justify-between">
                {STORY.map((s, i) => (
                  <button
                    key={s.title}
                    type="button"
                    tabIndex={-1}
                    onClick={() => go(i)}
                    className={cn(
                      "num -mx-1 cursor-pointer px-1 text-[0.8125rem] transition-colors",
                      active === i
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {localTime && (
          <p className="mt-4 text-sm text-muted-foreground">
            It is <span className="num">{localTime}</span> where you are, so the day opened at the
            nearest moment.
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------------- The four drawers, one at a time ---------------- */

function DrawerSwitcher() {
  const [index, setIndex] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const group = benefitGroups[index]!;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const n = benefitGroups.length;
    const next = {
      ArrowRight: (index + 1) % n,
      ArrowLeft: (index - 1 + n) % n,
      Home: 0,
      End: n - 1,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setIndex(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="mt-14" data-reveal>
      <div
        role="tablist"
        aria-label="Drawers in the wallet"
        onKeyDown={onKeyDown}
        className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2"
      >
        {benefitGroups.map((g, i) => {
          const selected = i === index;
          return (
            <button
              key={g.title}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`drawer-tab-${i}`}
              aria-selected={selected}
              aria-controls="drawer-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setIndex(i)}
              className={cn(
                "flex h-12 w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-3 text-[0.8125rem] font-medium transition-[background-color,color,border-color,transform] duration-200 active:scale-[0.97] sm:h-11 sm:w-auto sm:flex-none sm:justify-start sm:gap-2.5 sm:px-5 sm:text-[0.9375rem]",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-input bg-card text-foreground hover:border-foreground/40",
              )}
            >
              {g.title}
              <span
                className={cn(
                  "num text-[0.8125rem] font-normal",
                  selected ? "text-background/60" : "text-muted-foreground",
                )}
              >
                {g.items.length}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="drawer-panel"
        aria-labelledby={`drawer-tab-${index}`}
        className="mt-6 overflow-hidden rounded-2xl bg-card"
      >
        <div
          key={index}
          className="grid animate-in fade-in-0 duration-150 ease-out motion-reduce:animate-none lg:grid-cols-12"
        >
          <div className="border-b border-rule p-7 sm:p-10 lg:col-span-4 lg:border-b-0 lg:border-r">
            <h3 className="heading-serif text-[2rem] leading-[1.1] text-foreground sm:text-[2.5rem]">
              {group.title}
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-foreground">{group.summary}</p>
            <p className="num mt-8 text-[0.9375rem] text-muted-foreground">
              {group.items.length} tools in this drawer
            </p>
            {"photo" in group && (
              <img
                src={group.photo.src}
                alt={group.photo.alt}
                width={1200}
                height={900}
                loading="lazy"
                className="mt-8 aspect-[4/3] w-full rounded-xl object-cover"
              />
            )}
          </div>
          <ul className="grid gap-px bg-rule sm:grid-cols-2 lg:col-span-8 [&>li:last-child:nth-child(odd)]:sm:col-span-2">
            {group.items.map((raw) => {
              const { name, detail } = splitItem(raw);
              return (
                <li key={raw} className="bg-card px-7 py-5 sm:px-8 sm:py-6">
                  <p className="text-[1.0625rem] font-medium text-foreground">{name}</p>
                  {detail && (
                    <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted-foreground">
                      {detail}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------------- A frosted pill that follows the reader ---------------- */

function FloatingDemoBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Shown between the hero and the closing band, where the page has its own way in.
    const watched = ["front", "help", "site-footer"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    const onScreen = new Map<string, boolean>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) onScreen.set(entry.target.id, entry.isIntersecting);
      setVisible(onScreen.size === watched.length && ![...onScreen.values()].some(Boolean));
    });
    watched.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 hidden justify-center md:flex px-4 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div className="material flex items-center gap-4 rounded-full border border-transparent py-1.5 pl-5 pr-1.5 shadow-[var(--shadow-float)]">
        <p className="text-sm text-foreground">The Harringtons' wallet, with nothing live in it</p>
        <Button size="sm" className="rounded-full px-4" asChild>
          <Link to="/demo">
            Explore <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}

/* ---------------- A phone-only jump back to the top ---------------- */

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Appears once the reader is past the opening screen, where the way back is no longer obvious.
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    // Keyboard and screen-reader users should carry on from the top of the page, not from a button that just vanished.
    document.getElementById("main")?.focus({ preventScroll: true });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "material fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-foreground shadow-[var(--shadow-float)] transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none md:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
