import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  KeyRound,
  MessageCircle,
  Pill,
  Receipt,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import type { ReactNode } from "react";

import { MarketingLayout, frame } from "@/components/MarketingLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { faqLd, organizationLd, pageHead, softwareLd, websiteLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

// The home page (rebuilt 17 Nov 2026 for the phone app). Every screen shown is a capture of the current app with the
// made-up Harper household from the test copy, and every feature named here is one the app has today. Families
// download the app and subscribe inside it; agencies go to their plans. The earlier interactive web demo is retired.

const faqs = [
  {
    q: "How do I subscribe?",
    a: "Download the app, set up your household and choose monthly or yearly inside the app. The App Store handles the payment, and you can cancel in your App Store settings.",
  },
  {
    q: "Does my nanny or au pair pay?",
    a: "No. You invite them with a one-time code and they join your household free. One plan covers everyone, with no limit on staff.",
  },
  {
    q: "Is there an Android app?",
    a: "The iPhone app comes first. The Android app is on its way.",
  },
  {
    q: "Can my agency see what is in my wallet?",
    a: "No. An agency can fund a household's place, but it never sees your children's details, messages, photos, documents or anything else in your wallet.",
  },
  {
    q: "What does the Family Assistant do?",
    a: "You can ask it about the day or the week, or tell it what to log, by typing or speaking. It always shows you what it is about to save and asks first. It uses AI and can make mistakes, so check anything important.",
  },
  {
    q: "Is this payroll?",
    a: "No. Family Wallet keeps the hours, timesheets, expenses and paperwork in one place. It does not run payroll or give tax advice.",
  },
];

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "Family Wallet: the Private App for Families with a Nanny",
      description:
        "One private app for a family and their nanny, au pair or household staff: the day's routines, the shared calendar, timesheets, expenses and documents. £9.99 a month.",
      path: "/",
      jsonLd: [
        organizationLd(),
        websiteLd(),
        softwareLd([
          {
            name: "Family",
            price: "9.99",
            description: "Unlimited staff, billed monthly or £99.99 a year, in the app.",
          },
        ]),
        faqLd(faqs),
      ],
    }),
  component: Index,
});

function Phone({
  src,
  alt,
  className,
  eager,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[19rem] rounded-[2.75rem] bg-foreground p-2 shadow-[0_30px_60px_-20px_rgba(20,32,26,0.45)]",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        width={660}
        height={1434}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="block h-auto w-full rounded-[2.25rem]"
      />
    </div>
  );
}

const steps = [
  {
    title: "Download and set up your household",
    body: "Add your children, emergency contacts and the hours your nanny works. It takes a few minutes.",
  },
  {
    title: "Invite your nanny with a code",
    body: "Send a one-time code. They sign in on their own phone and join your household free.",
  },
  {
    title: "Run the day together",
    body: "Everyone sees the same day and the same week, so nothing has to be chased by text.",
  },
];

const features: { title: string; body: string; points: string[]; src: string; alt: string }[] = [
  {
    title: "Today, at a glance",
    body: "Home shows who is working, how the day is going and anything that needs your attention.",
    points: [
      "One-tap log for notes, medicine, meals, naps and activities",
      "Today's timeline for the whole household",
      "Shift progress and requests to change hours",
    ],
    src: "/images/app/home.jpg",
    alt: "Family Wallet home screen showing this week, the nanny on duty and the quick routine log",
  },
  {
    title: "One calendar for the week",
    body: "Working hours, clubs, school holidays and plans sit on one calendar that both sides can see.",
    points: [
      "Week and month views",
      "Weekly clubs and activities added once",
      "Shift changes approved by the other side",
    ],
    src: "/images/app/calendar.jpg",
    alt: "Family Wallet calendar in month view with working days marked",
  },
  {
    title: "A Family Assistant that asks first",
    body: "Ask about the day, check the schedule or say what to log. It shows you what it will save and waits for your yes.",
    points: [
      "Type or speak",
      "Today's review and a weekly summary",
      "Uses AI and can make mistakes, so it never saves without you",
    ],
    src: "/images/app/assistant.jpg",
    alt: "Family Assistant screen with shortcuts for today's review, the schedule and a weekly summary",
  },
  {
    title: "Everyone who matters, in one place",
    body: "The people in your household, your children's allergies and medication, and the emergency card, where a carer can find them fast.",
    points: [
      "Children's routines, allergies and medication",
      "Emergency card with contacts and doctor",
      "Staff documents with expiry dates",
    ],
    src: "/images/app/family.jpg",
    alt: "Family screen listing the parents, the nanny and the children with an allergy note",
  },
];

const also: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <MessageCircle aria-hidden />,
    title: "Messages and photos",
    body: "Conversations by topic and a shared photo feed, kept out of group chats.",
  },
  {
    icon: <Timer aria-hidden />,
    title: "Timesheets and hours",
    body: "Shifts submitted and approved, with holiday and leave.",
  },
  {
    icon: <Receipt aria-hidden />,
    title: "Expenses and petty cash",
    body: "Receipts logged and repaid, and a float that adds up.",
  },
  {
    icon: <Pill aria-hidden />,
    title: "Medication and incidents",
    body: "What was given, when and by whom, and a record of any bumps.",
  },
  {
    icon: <KeyRound aria-hidden />,
    title: "House manual and codes",
    body: "Wi-Fi, alarm and key codes, hidden until someone taps to show them.",
  },
  {
    icon: <FileText aria-hidden />,
    title: "Agreement and documents",
    body: "The agreement signed in the app, and paperwork with expiry dates.",
  },
  {
    icon: <ClipboardList aria-hidden />,
    title: "Handover and weekly report",
    body: "End-of-day notes for the next person and the week on one page.",
  },
  {
    icon: <CalendarDays aria-hidden />,
    title: "Groceries, travel and more",
    body: "A shared shopping list, a travel pack and the kids' playbook.",
  },
];

const privacy = [
  {
    title: "Your household only",
    body: "Each household's information is kept to the people in it. Access is enforced by rules in the database, not just by the app.",
  },
  {
    title: "Agencies never see inside",
    body: "An agency that funds your place sees its own seats and invitations. It cannot open your wallet.",
  },
  {
    title: "No ads, no tracking",
    body: "We do not sell your information, and the app has no third-party analytics or advertising.",
  },
  {
    title: "Yours to take away",
    body: "Download a copy of everything in your wallet from the app whenever you like.",
  },
];

function Index() {
  return (
    <MarketingLayout>
      <main>
        {/* Hero */}
        <section
          className={cn(
            frame,
            "grid items-center gap-12 pb-16 pt-12 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-20",
          )}
        >
          <div className="lg:col-span-7">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">
              For families with a nanny, au pair or household staff
            </p>
            <h1 className="heading-serif mt-4 text-balance text-[2.75rem] leading-[1.02] text-foreground sm:text-6xl lg:text-[4.25rem]">
              Your household, in one private app
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Family Wallet keeps the day, the week and the paperwork in one place for you and the
              people who care for your children, instead of across messages, notes and folders.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" className="h-14 rounded-full px-7 text-base" asChild>
                <a href="/download">
                  Download Family Wallet <ArrowRight aria-hidden />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-full px-7 text-base"
                asChild
              >
                <a href="/pricing?for=agencies">Explore agency plans</a>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              £9.99 a month or £99.99 a year for your whole household. Nannies and staff join free.
            </p>
          </div>
          <div className="lg:col-span-5">
            <Phone
              eager
              src="/images/app/home.jpg"
              alt="The Family Wallet app on the home screen, with a made-up family as the example"
            />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              The Harpers are a made-up family. The screens are from the current app.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 bg-card py-20 lg:py-28">
          <div className={frame}>
            <h2 className="heading-serif max-w-2xl text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl">
              Set up in minutes, shared from day one
            </h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="border-t border-border pt-6">
                  <span className="heading-serif text-3xl text-brand">{i + 1}</span>
                  <h3 className="mt-3 text-xl font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features, each beside a real screen */}
        <section id="features" className="scroll-mt-16 py-20 lg:py-28">
          <div className={cn(frame, "space-y-20 lg:space-y-28")}>
            {features.map((f, i) => (
              <div key={f.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className={cn(i % 2 === 1 && "lg:order-2")}>
                  <h2 className="heading-serif text-balance text-[2rem] leading-[1.1] text-foreground sm:text-[2.75rem]">
                    {f.title}
                  </h2>
                  <p className="mt-4 max-w-[32rem] text-lg leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {f.points.map((p) => (
                      <li key={p} className="flex gap-3 text-[1.0625rem] text-foreground">
                        <Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <Phone src={f.src} alt={f.alt} className={cn(i % 2 === 1 && "lg:order-1")} />
              </div>
            ))}
          </div>
        </section>

        {/* Everything else in the app */}
        <section className="bg-card py-20 lg:py-28">
          <div className={frame}>
            <h2 className="heading-serif max-w-2xl text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl">
              Also in the app
            </h2>
            <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {also.map((a) => (
                <li key={a.title}>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand [&_svg]:size-5">
                    {a.icon}
                  </span>
                  <h3 className="mt-4 text-[1.0625rem] font-semibold text-foreground">{a.title}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">
                    {a.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Two routes: families and agencies */}
        <section id="families" className="scroll-mt-16 py-20 lg:py-28">
          <div className={cn(frame, "grid gap-6 lg:grid-cols-2")}>
            <article className="flex flex-col rounded-3xl bg-brand p-8 text-brand-foreground sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
                For families
              </p>
              <h2 className="heading-serif mt-3 text-[2rem] leading-[1.1] sm:text-[2.5rem]">
                One plan for your whole household
              </h2>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="heading-serif text-5xl">£9.99</span>
                <span className="opacity-80">a month</span>
              </p>
              <p className="mt-1 opacity-80">or £99.99 a year, which saves about 17%</p>
              <ul className="mt-6 space-y-2.5">
                {[
                  "Every feature in the app",
                  "Unlimited co-parents and staff",
                  "Nannies, au pairs and staff join free",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <a
                  href="/download"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-medium text-brand transition-opacity hover:opacity-90"
                >
                  Download Family Wallet <ArrowRight className="size-4" aria-hidden />
                </a>
                <p className="mt-3 text-sm opacity-80">You subscribe inside the app.</p>
              </div>
            </article>
            <article
              id="agencies"
              className="flex scroll-mt-16 flex-col rounded-3xl bg-card p-8 ring-1 ring-border sm:p-10"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                For agencies
              </p>
              <h2 className="heading-serif mt-3 text-[2rem] leading-[1.1] text-foreground sm:text-[2.5rem]">
                Give every client family a wallet
              </h2>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="text-muted-foreground">from</span>
                <span className="heading-serif text-5xl text-foreground">£39</span>
                <span className="text-muted-foreground">a month</span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Partner, Growth and Scale plans by household seats; Enterprise by quote
              </p>
              <ul className="mt-6 space-y-2.5 text-foreground">
                {[
                  "A seat is one household, however many carers it has",
                  "Single-use invitation codes for your families",
                  "You never see inside a family's wallet",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap gap-3 pt-8">
                <Button size="lg" className="h-12 rounded-full px-6" asChild>
                  <a href="/pricing?for=agencies">Explore agency plans</a>
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-full px-6" asChild>
                  <a href="/pricing?for=agencies#enterprise">Talk to us about Enterprise</a>
                </Button>
              </div>
            </article>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="scroll-mt-16 bg-ink-band py-20 text-white lg:py-28">
          <div className={frame}>
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-6" aria-hidden />
              <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
                Private by design
              </p>
            </div>
            <h2 className="heading-serif mt-4 max-w-2xl text-balance text-[2.25rem] leading-[1.08] sm:text-5xl">
              Your family's information stays with your family
            </h2>
            <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {privacy.map((p) => (
                <li key={p.title} className="border-t border-white/25 pt-5">
                  <h3 className="text-[1.0625rem] font-semibold">{p.title}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed opacity-80">{p.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-10 text-sm opacity-80">
              The detail is in our{" "}
              <a href="/privacy" className="underline underline-offset-4">
                privacy policy
              </a>
              .
            </p>
          </div>
        </section>

        {/* Questions */}
        <section id="faq" className="scroll-mt-16 py-20 lg:py-28">
          <div className={cn(frame, "grid gap-10 lg:grid-cols-12 lg:gap-8")}>
            <h2 className="heading-serif text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl lg:col-span-4">
              Questions
            </h2>
            <Accordion type="single" collapsible className="lg:col-span-7 lg:col-start-6">
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left text-[1.0625rem]">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-[0.9375rem] leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Last call */}
        <section className="pb-24">
          <div className={frame}>
            <div className="rounded-3xl bg-card px-8 py-14 text-center ring-1 ring-border sm:py-20">
              <Sparkles className="mx-auto size-6 text-brand" aria-hidden />
              <h2 className="heading-serif mx-auto mt-4 max-w-2xl text-balance text-[2.25rem] leading-[1.08] text-foreground sm:text-5xl">
                Bring your household together
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                Download the app, set up your household and invite the people who help you run it.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button size="lg" className="h-14 rounded-full px-7 text-base" asChild>
                  <a href="/download">Download Family Wallet</a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full px-7 text-base"
                  asChild
                >
                  <a href="/pricing">See pricing</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
