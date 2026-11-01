import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Calculator,
  Check,
  Clock,
  FileText,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  Mail,
  Menu,
  Pill,
  PlayCircle,
  ReceiptText,
  ShieldCheck,
  Siren,
  Smartphone,
  CalendarDays,
  Heart,
  HeartHandshake,
  Wallet,
} from "lucide-react";

import { FamilyLogin } from "@/components/FamilyLogin";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      "House Manual & Codes — WiFi, alarm and lockbox codes, utilities, house rules, bin days and appliances",
      "Kids' Playbook — quirks and comforts, how we handle big moments, friends and rainy-day ideas",
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
      "Your Nannytax referral code",
      "Agency terms and conditions",
      "Reviews & check-ins — 6-month and yearly conversation guides",
    ],
  },
  {
    icon: HeartHandshake,
    title: "Support & extras",
    summary: "Trusted ideas, thoughtful extras and everything that makes family life easier.",
    featured: ["Messages", "Family perks", "Training hub"],
    items: [
      "Messages — topic conversations between family and nanny, kept in the wallet",
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

const headlineBenefits = [
  {
    icon: CalendarDays,
    title: "Everyone sees the same week",
    detail: "Shifts, school runs and clubs in one shared planner.",
  },
  {
    icon: Pill,
    title: "No double-dosing with the medication log",
    detail: "Every dose timed and signed, so nobody has to text to check.",
  },
  {
    icon: ReceiptText,
    title: "A Friday report ready to print",
    detail: "Hours, activities, handovers and expenses, summed up for you.",
  },
  {
    icon: Siren,
    title: "Emergency details always to hand",
    detail: "Key contacts, allergies and instructions in one tap.",
  },
  {
    icon: FileText,
    title: "Your nanny agreement, signed and filed",
    detail: "Build it, sign it together and keep it safe.",
  },
  {
    icon: LifeBuoy,
    title: "Petty cash that always adds up",
    detail: "Top-ups and receipts logged, so everyone knows what's left.",
  },
  {
    icon: KeyRound,
    title: "No more ‘what’s the WiFi password?’",
    detail:
      "House Manual & Codes keeps access details and household essentials together, with codes hidden until revealed.",
  },
  {
    icon: Heart,
    title: "Everyone on the same page with the kids",
    detail:
      "The Kids' Playbook shares what soothes each child, the house rules you agree on, friends and rainy-day ideas.",
  },
];

const display = "font-serif tracking-tight";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#included", label: "What's included" },
] as const;

function splitItem(item: string) {
  const [name, ...rest] = item.split(" — ");
  const detail = rest.join(" — ");
  return { name, detail: detail ? detail[0]!.toUpperCase() + detail.slice(1) : undefined };
}

function Logo() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Wallet className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <span className={cn(display, "truncate text-lg font-semibold text-foreground")}>
        The Family Wallet
      </span>
    </Link>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((n) => (
            <Button key={n.href} variant="ghost" size="sm" asChild>
              <a href={n.href}>{n.label}</a>
            </Button>
          ))}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/demo">Demo</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/calculator">Cost calculator</Link>
          </Button>
        </nav>
        <div className="flex items-center gap-2">
          <span className="mr-1 hidden items-center gap-1.5 text-xs font-medium text-muted-foreground lg:flex">
            <LockKeyhole className="h-3.5 w-3.5 text-primary" /> Private &amp; secure
          </span>
          <Button size="sm" className="hidden sm:inline-flex" asChild>
            <a href="#sign-in">Open my wallet</a>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className={display}>The Family Wallet</SheetTitle>
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

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className={cn(display, "mt-3 text-3xl font-semibold text-foreground sm:text-4xl")}>
        {title}
      </h2>
      {body && <p className="mt-4 text-pretty text-muted-foreground">{body}</p>}
    </div>
  );
}

function ItemList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {items.map((raw) => {
        const { name, detail } = splitItem(raw);
        return (
          <li key={raw} className="flex gap-3">
            <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-secondary/25 text-primary">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <div className="text-sm leading-relaxed">
              <p className="font-medium text-foreground">{name}</p>
              {detail && <p className="text-muted-foreground">{detail}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Index() {
  return (
    <div className="min-h-screen overflow-x-clip bg-sand">
      <SiteHeader />

      <main>
        {/* Hero + sign-in */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[560px] bg-[radial-gradient(60%_60%_at_15%_0%,color-mix(in_oklch,var(--secondary)_22%,transparent),transparent),radial-gradient(50%_50%_at_90%_10%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pb-28 lg:pt-20">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Badge
                variant="outline"
                className="gap-1.5 rounded-full bg-card px-3 py-1 font-medium"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Your childcare, safely in
                one place
              </Badge>
              <h1
                className={cn(
                  display,
                  "mt-6 text-4xl font-semibold leading-[1.05] text-primary sm:text-5xl lg:text-6xl dark:text-foreground",
                )}
              >
                Your family and your new nanny,{" "}
                <span className="text-[oklch(0.56_0.12_68)] dark:text-primary">
                  beautifully organised.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                Routines, essential documents, daily notes and messages, together in one private
                place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" variant="outline" className="h-11 bg-card" asChild>
                  <Link to="/demo">
                    <PlayCircle className="h-4 w-4" /> Explore the demo
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" className="h-11" asChild>
                  <Link to="/calculator">
                    <Calculator className="h-4 w-4" /> What will a nanny really cost?
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                New to the wallet? Step inside a complete sample Family Wallet with no login.
                Nothing in the demo is live.
              </p>
            </div>
            <FamilyLogin
              className="animate-in fade-in slide-in-from-bottom-3 duration-500"
              footer={
                <p className="text-center text-xs text-muted-foreground">
                  Lost your details?{" "}
                  <a
                    href="#help"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
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
        </section>

        {/* Preview + headline benefits */}
        <section
          id="features"
          className="scroll-mt-16 border-y border-border/70 bg-background/65 py-20 lg:py-28"
        >
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionHeading
              eyebrow="Inside your Family Wallet"
              title="Everything around your nanny, in one place"
              body="A practical daily home for parents and nannies, with everything in one private place."
            />
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              <TodayPreview className="lg:sticky lg:top-24 lg:self-start" />
              <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                {headlineBenefits.map(({ icon: Icon, title, detail }) => (
                  <li key={title}>
                    <Card className="h-full rounded-2xl shadow-sm transition-shadow hover:shadow-md">
                      <CardHeader className="space-y-3 p-5 pb-2">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <CardTitle className="font-sans text-base leading-snug">{title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        <CardDescription className="leading-relaxed">{detail}</CardDescription>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Everything included */}
        <section id="included" className="scroll-mt-16 py-20 lg:py-28">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <SectionHeading
              eyebrow="The full toolkit"
              title="See everything included"
              body="All the tools and support included in your Family Wallet."
            />

            <Tabs defaultValue={benefitGroups[0]!.title} className="mt-12 hidden md:block">
              <TabsList className="grid h-auto w-full grid-cols-4 rounded-xl p-1">
                {benefitGroups.map(({ icon: Icon, title }) => (
                  <TabsTrigger key={title} value={title} className="h-10 gap-2 rounded-lg">
                    <Icon className="h-4 w-4" /> {title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {benefitGroups.map(({ title, summary, items }) => (
                <TabsContent key={title} value={title} className="mt-6">
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="p-6 sm:p-8">
                      <p className="mb-6 text-sm text-muted-foreground">{summary}</p>
                      <ItemList items={items} />
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>

            <Accordion
              type="single"
              collapsible
              defaultValue={benefitGroups[0]!.title}
              className="mt-10 rounded-2xl border bg-card px-4 md:hidden"
            >
              {benefitGroups.map(({ icon: Icon, title, items }) => (
                <AccordionItem key={title} value={title} className="last:border-b-0">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-primary" /> {title}
                      <Badge variant="secondary" className="ml-1">
                        {items.length}
                      </Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ItemList items={items} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Help */}
        <section id="help" className="scroll-mt-16 px-5 pb-20 sm:px-8 lg:pb-28">
          <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl bg-primary p-8 text-primary-foreground sm:p-12 lg:grid-cols-2 lg:gap-12 dark:bg-card dark:text-card-foreground">
            <div className="flex gap-4">
              <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-white/10">
                <Smartphone className="h-5 w-5" />
              </span>
              <div>
                <h2 className={cn(display, "text-2xl font-semibold")}>Opening your wallet</h2>
                <p className="mt-2 text-pretty leading-relaxed opacity-75">
                  We send your personal wallet link and short access code. Enter them once and
                  choose “Remember this device” to stay signed in for 12 months.
                </p>
                <Button
                  className="mt-5 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  asChild
                >
                  <a href="#sign-in">
                    Open my wallet <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-white/10">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <h2 className={cn(display, "text-2xl font-semibold")}>Need your details again?</h2>
                <p className="mt-2 text-pretty leading-relaxed opacity-75">
                  Contact your agency and they will resend your link and code.
                </p>
                <Button
                  variant="outline"
                  className="mt-5 border-white/25 bg-transparent text-inherit hover:bg-white/10 hover:text-inherit"
                  asChild
                >
                  <Link to="/admin">Agency sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:px-8">
          <Logo />
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link to="/demo" className="hover:text-foreground">
              Demo wallet
            </Link>
            <Link to="/calculator" className="hover:text-foreground">
              Cost calculator
            </Link>
            <Link to="/admin" className="hover:text-foreground">
              Agency sign in
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} The Family Wallet</p>
        </div>
      </footer>
    </div>
  );
}

const PREVIEW_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PREVIEW_ITEMS = [
  { time: "3:30pm", title: "School pick-up", note: "Jess (nanny shift 3:30–8pm)" },
  { time: "4:30pm", title: "Football training", note: "Bring shin pads" },
  { time: "6:00pm", title: "Dinner from Nanny Fuel", note: "Chicken traybake" },
];
const PREVIEW_IDEAS = ["1km family run", "Park cricket", "Reading den"];

function TodayPreview({ className }: { className?: string }) {
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => {
    setToday((new Date().getDay() + 6) % 7);
  }, []);
  return (
    <Card className={cn("rounded-2xl shadow-sm", className)} aria-label="Sample calendar preview">
      <CardHeader className="p-6 pb-4">
        <Badge variant="secondary" className="w-fit">
          Sample preview
        </Badge>
        <CardTitle className={cn(display, "pt-1 text-xl")}>Today at the Harringtons'</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6 pt-0">
        <div className="grid grid-cols-7 gap-1 rounded-lg bg-muted p-1" aria-hidden>
          {PREVIEW_DAYS.map((d, i) => (
            <span
              key={d}
              className={cn(
                "rounded-md py-1.5 text-center text-xs font-medium text-muted-foreground",
                i === today && "bg-primary text-primary-foreground shadow-sm",
              )}
            >
              {d}
            </span>
          ))}
        </div>
        <ol className="relative space-y-4 border-l border-border pl-5">
          {PREVIEW_ITEMS.map((it) => (
            <li key={it.time} className="relative">
              <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-card bg-secondary ring-1 ring-secondary" />
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="h-3 w-3" /> {it.time}
              </p>
              <p className="text-sm font-medium text-foreground">{it.title}</p>
              <p className="text-sm text-muted-foreground">{it.note}</p>
            </li>
          ))}
        </ol>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Suggested activities
          </p>
          <div className="flex flex-wrap gap-2">
            {PREVIEW_IDEAS.map((a) => (
              <span
                key={a}
                className="rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
