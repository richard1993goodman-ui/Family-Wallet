import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { FileText, IdCard, Calculator, Shield, Sparkles, Apple, KeyRound } from "lucide-react";

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
    ],
  }),
  component: Index,
});

const items = [
  { icon: FileText, label: "Your nanny agreement" },
  { icon: IdCard, label: "Your nanny's CV" },
  { icon: Calculator, label: "Timesheet calculator" },
  { icon: Apple, label: "Nanny Fuel meal ideas" },
  { icon: Sparkles, label: "Nanny activity guide" },
  { icon: Shield, label: "Membership terms & our family guarantee" },
];

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
          Every family that joins us gets their own private wallet. It holds everything you need in
          one place, so you are never hunting through emails for a document again.
        </p>

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
