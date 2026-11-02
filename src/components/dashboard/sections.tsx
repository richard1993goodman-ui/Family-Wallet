import { Link } from "@tanstack/react-router";
import { ChevronRight, Siren } from "lucide-react";
import type { ReactNode } from "react";

import { ContactRow, SectionTitle } from "@/components/dashboard/tiles";
import type { DashboardWallet } from "@/components/dashboard/types";

export function DashboardHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
}) {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="heading-display mt-2 text-3xl leading-tight text-primary md:text-[2.5rem]">
        {title}
      </h1>
      {subtitle && <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

export function DemoBanner({ slug }: { slug: string }) {
  if (slug !== "demo") return null;
  return (
    <div className="surface-card mb-6 p-4 text-sm">
      <p className="font-semibold text-primary">You're viewing a demo Family Wallet</p>
      <p className="mt-1 text-muted-foreground">
        The Harrington family, their nanny Jess and everything here are examples. Explore freely —
        as a member, your own private wallet is set up with your family, your nanny and your
        agreement.
      </p>
    </div>
  );
}

export function EmergencyCardLink({ slug }: { slug: string }) {
  return (
    <Link
      to="/emergency/$slug"
      params={{ slug }}
      className="flex items-center gap-4 rounded-2xl border border-destructive/30 bg-card p-4 shadow-[var(--shadow-soft)] transition-colors hover:border-destructive"
    >
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Siren className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">Emergency card</span>
        <span className="block text-sm text-muted-foreground">
          Contacts, allergies, medication, GP and address
        </span>
      </span>
      <ChevronRight className="h-4 w-4 flex-none text-muted-foreground/60" />
    </Link>
  );
}

export function EmergencyContacts({ wallet }: { wallet: DashboardWallet }) {
  const nannyContacts = wallet.nannies.filter((n) => n.emergency);
  if (nannyContacts.length === 0 && wallet.contacts.length === 0) return null;
  return (
    <section>
      <SectionTitle>Emergency contacts</SectionTitle>
      <div className="ios-group">
        {wallet.contacts.map((contact, i) => (
          <ContactRow key={`family-${i}`} label="Family contact" contact={contact} />
        ))}
        {nannyContacts.map((nanny) => (
          <ContactRow
            key={nanny.id}
            label={nanny.isYou ? "Your emergency contact" : `${nanny.name}'s emergency contact`}
            contact={nanny.emergency!}
          />
        ))}
      </div>
    </section>
  );
}

export function NannyProfiles({ wallet }: { wallet: DashboardWallet }) {
  if (wallet.nannies.length === 0) return null;
  return (
    <section>
      <SectionTitle>{wallet.nannies.length > 1 ? "Your nannies" : "Your nanny"}</SectionTitle>
      <div className="surface-card space-y-4 p-5">
        {wallet.nannies.map((nanny) => (
          <div key={nanny.id} className="flex items-start gap-4">
            {nanny.photoUrl ? (
              <img
                src={nanny.photoUrl}
                alt={nanny.name}
                className="h-14 w-14 flex-none rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-accent font-serif text-xl font-semibold text-primary">
                {nanny.name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <p className="heading-display text-lg text-foreground">{nanny.name}</p>
              {nanny.bio && (
                <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">{nanny.bio}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardFooter({ updatedAt, onLock }: { updatedAt: string; onLock: () => void }) {
  return (
    <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
      <p>
        Wallet last updated{" "}
        {new Date(updatedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <button
        type="button"
        className="text-sm underline underline-offset-4 hover:text-foreground"
        onClick={onLock}
      >
        Lock this wallet on this device
      </button>
    </div>
  );
}

export function Column({ children }: { children: ReactNode }) {
  return <div className="min-w-0 space-y-8">{children}</div>;
}
