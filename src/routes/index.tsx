import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
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

const items = [
  { icon: Siren, label: "Emergency card — key contacts and instructions at a glance" },
  { icon: LifeBuoy, label: "Request cover — emergency cover, babysitting and extra days" },
  { icon: FileText, label: "Your nanny agreement" },
  { icon: IdCard, label: "Your nanny's CV, profile and references" },
  { icon: Shield, label: "Checks & credentials — DBS, ID and right to work" },
  { icon: Users, label: "Know my family — children's profiles and the nanny quick guide" },
  { icon: CalendarDays, label: "Weekly planner — what's on each day, Monday to Sunday" },
  { icon: NotebookPen, label: "Daily log — how each day went" },
  { icon: ClipboardCheck, label: "End-of-day handover — homework, dinner, mood and tomorrow's kit" },
  { icon: ReceiptText, label: "Expenses tracker — petty cash and reimbursement notes" },
  { icon: ClipboardCheck, label: "Friday Weekly Report — a polished recap of the week, ready to print" },
  { icon: Plane, label: "Travel & Villa Nanny Pack — travel mode with checklist and holiday handover notes" },
  { icon: Gift, label: "VIP Member Perks & London Partner Concierge — private offers and trusted recommendations" },
  { icon: Library, label: "Curated Seasonal Playbooks — timely activity, sport and family guides" },
  { icon: Pill, label: "Medication log — timestamped doses so nobody double-doses" },
  { icon: Dumbbell, label: "Active Kids Sports Passport — skills, challenges and confidence wins" },
  { icon: CalendarCheck, label: "Reviews & check-ins — 6-month and yearly conversation guides" },
  { icon: MessagesSquare, label: "Ask Athlete Mannies — message us straight from the wallet" },
  { icon: GraduationCap, label: "Nanny training hub — safeguarding, routines and emergencies" },
  { icon: Award, label: "Nanny training certificate — kept in the wallet once passed" },
  { icon: Calculator, label: "Timesheet calculator" },
  { icon: UtensilsCrossed, label: "Nanny Fuel — cooking and meal ideas" },
  { icon: Sparkles, label: "Nanny activity guide" },
  { icon: BadgePercent, label: "Your Nannytax referral code and membership perks" },
  { icon: Shield, label: "Your membership tier, fees, terms and our family guarantee" },
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
    <div className="mt-8 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <KeyRound className="h-5 w-5 text-primary" />
        <h2 className="heading-display text-lg text-foreground">Family login</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Already have your link and code? Open your wallet here.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="wallet-link">Your wallet link</Label>
          <Input
            id="wallet-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="e.g. smith-4f2a"
            autoComplete="off"
            required
            className="mt-1"
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
            className="mt-1 uppercase tracking-widest"
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
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Opening…" : "Open my wallet"}
        </Button>

      </form>
    </div>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-2xl px-5 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Athlete Mannies &amp; Nannies
        </p>
        <h1 className="heading-display mt-3 text-4xl leading-tight text-primary">
          The Family Wallet
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-foreground/90">

        </p>

        <FamilyLogin />

        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="heading-display text-lg text-foreground">Inside your wallet</h2>
          <ul className="mt-4 space-y-3">
            {items.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-[15px] text-foreground/90">
                <Icon className="h-5 w-5 flex-shrink-0 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="heading-display text-lg text-foreground">Opening your wallet</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">
            We send you a personal wallet link and a short access code. Open the link, enter the
            code once, and your wallet stays open on that device for 30 days.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Lost your link or code? Message us on WhatsApp or email richard@athletemannies.com and
            we will send it again.
          </p>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/admin"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Agency sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
