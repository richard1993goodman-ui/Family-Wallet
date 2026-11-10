import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, FileText, LockKeyhole, Pill, ReceiptText, Siren, Smartphone, MessagesSquare } from "lucide-react";
import { getPartnerBrand } from "@/lib/partner-brand.functions";
import { FamilyLogin } from "@/components/FamilyLogin";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/p/$handle/")({
  loader: async ({ params }) => {
    const brand = await getPartnerBrand({ data: { handle: params.handle } });
    if (!brand) throw notFound();
    return brand;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.walletName} — Powered by The Family Wallet` : "Family Wallet unavailable";
    const description = loaderData
      ? `${loaderData.agencyName}'s private Family Wallet: shared calendar, nanny agreement, emergency card, medication log and Friday reports.`
      : "This Family Wallet page isn't available.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: PartnerHome,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-sand px-6 text-center">
      <p className="text-muted-foreground">This Family Wallet page isn't available.</p>
    </div>
  ),
});

const benefits = [
  { icon: CalendarDays, title: "Everyone sees the same week", detail: "Shifts, school runs and clubs in one shared planner." },
  { icon: Pill, title: "No double-dosing", detail: "Every medication dose timed and signed." },
  { icon: ReceiptText, title: "A Friday report ready to print", detail: "Hours, activities, handovers and expenses." },
  { icon: Siren, title: "Emergency details to hand", detail: "Contacts, allergies and instructions in one tap." },
  { icon: FileText, title: "Nanny agreement, signed and filed", detail: "Build it, sign it together, keep it safe." },
  { icon: MessagesSquare, title: "Talk to your agency", detail: "Message us straight from the wallet." },
];

function PartnerHome() {
  const brand = Route.useLoaderData();
  const initials = brand.agencyName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-border/70 bg-background/75">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4 sm:px-8">
          {brand.logo ? (
            <img src={brand.logo} alt={`${brand.agencyName} logo`} className="h-10 max-w-[140px] object-contain" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary font-display text-sm font-semibold text-primary-foreground">{initials}</span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{brand.agencyName}</p>
            <p className="text-xs text-muted-foreground">Powered by The Family Wallet</p>
          </div>
          <span className="ml-auto hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
            <LockKeyhole className="h-3.5 w-3.5 text-primary" /> Private &amp; secure
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8">
        <p className="text-xs font-medium text-primary">Your childcare, beautifully organised</p>
        <h1 className="heading-display mt-3 text-4xl leading-tight text-primary sm:text-5xl">{brand.walletName}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/80 sm:text-lg">
          Your routines, documents and everyday support from {brand.agencyName}, together in one private place.
        </p>
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          <div>
            <FamilyLogin />
            <div className="mt-4 rounded-2xl border border-secondary/70 bg-background/70 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 flex-none items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Smartphone className="h-5 w-5" /></span>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">New to the wallet?</p>
                  <h2 className="heading-display mt-1 text-xl text-foreground">Explore the demo</h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/75">Step inside a sample family's wallet. Nothing in the demo is live.</p>
              <Button asChild variant="outline" size="lg" className="mt-4 w-full border-primary/30 bg-card/70">
                <Link to="/p/$handle/demo" params={{ handle: brand.handle }}>View the demo wallet <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {benefits.map(({ icon: Icon, title, detail }) => (
              <li key={title} className="flex gap-3 rounded-xl border border-border/80 bg-card/75 p-4 shadow-sm">
                <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <div>
                  <h3 className="font-semibold leading-snug text-foreground">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
