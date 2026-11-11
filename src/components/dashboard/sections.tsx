import { formatDate } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Siren } from "lucide-react";
import type { ReactNode } from "react";

import { ContactRow, SectionTitle } from "@/components/dashboard/tiles";
import type { DashboardWallet } from "@/components/dashboard/types";
import { useT } from "@/lib/i18n/provider";

export function DashboardHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="heading-serif text-[1.625rem] leading-[1.1] text-foreground sm:text-[2rem]">
          {title}
        </h1>
        <p className="mt-2 text-[0.9375rem] text-muted-foreground">
          {eyebrow}
          {subtitle && <span> · {subtitle}</span>}
        </p>
      </div>
      {actions && <div className="flex flex-none flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function DemoBanner({ slug }: { slug: string }) {
  const t = useT();
  if (slug !== "demo") return null;
  return (
    <div className="mb-8 flex gap-3 rounded-lg border border-brand/20 bg-brand-soft/60 px-4 py-2.5 text-[0.8125rem] leading-relaxed">
      <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-brand" aria-hidden="true" />
      <div>
        <p className="text-foreground/80">
          <span className="font-medium text-foreground">{t("dash.youReViewingADemo")}</span>
          {t("dash.demoNote")}{" "}
          <Link to="/" className="font-medium text-foreground underline underline-offset-4">{t("dash.exitTheDemo")}</Link>
        </p>
      </div>
    </div>
  );
}

export function EmergencyCardLink({ slug }: { slug: string }) {
  const t = useT();
  return (
    <Link
      to="/emergency/$slug"
      params={{ slug }}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5 transition-colors hover:border-destructive/50 active:bg-raised"
    >
      <Siren className="h-4 w-4 flex-none text-destructive" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">{t("dash.emergencyCard")}</span>
        <span className="block text-sm text-muted-foreground">{t("dash.contactsAllergiesMedicationGpAnd")}</span>
      </span>
      <ChevronRight className="h-4 w-4 flex-none text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function EmergencyContacts({ wallet }: { wallet: DashboardWallet }) {
  const t = useT();
  const nannyContacts = wallet.nannies.filter((n) => n.emergency);
  if (nannyContacts.length === 0 && wallet.contacts.length === 0) return null;
  return (
    <section>
      <SectionTitle>{t("dash.emergencyContacts")}</SectionTitle>
      <div className="ios-group">
        {wallet.contacts.map((contact, i) => (
          <ContactRow key={`family-${i}`} label={t("dash.familyContact")} contact={contact} />
        ))}
        {nannyContacts.map((nanny) => (
          <ContactRow
            key={nanny.id}
            label={nanny.isYou ? t("dash.yourEmergencyContact") : t("dash.staffEmergencyContact", { name: nanny.name })}
            contact={nanny.emergency!}
          />
        ))}
      </div>
    </section>
  );
}

export function NannyProfiles({ wallet }: { wallet: DashboardWallet }) {
  const t = useT();
  if (wallet.nannies.length === 0) return null;
  return (
    <section>
      <SectionTitle>{wallet.nannies.length > 1 ? t("dash.yourNannies") : t("dash.yourNanny")}</SectionTitle>
      <div className="surface-card space-y-4 p-5">
        {wallet.nannies.map((nanny) => (
          <div key={nanny.id} className="flex items-start gap-4">
            {nanny.photoUrl ? (
              <img
                src={nanny.photoUrl}
                alt={nanny.name}
                className="h-12 w-12 flex-none rounded-full object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-brand-soft font-serif text-xl text-brand">
                {nanny.name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-medium text-foreground">{nanny.name}</p>
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

export function DashboardFooter({
  updatedAt,
  onLock,
  billingSlug,
}: {
  updatedAt: string;
  onLock: () => void;
  /** Set for households that pay through Stripe; shows a link to manage the subscription. */
  billingSlug?: string | undefined;
}) {
  const t = useT();
  return (
    <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-[0.8125rem] text-muted-foreground">
      <p>
        Wallet last updated{" "}
        {formatDate(updatedAt, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <button
        type="button"
        className="text-[0.8125rem] underline decoration-foreground/25 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        onClick={onLock}
      >{t("dash.lockThisWalletOnThis")}</button>
      {billingSlug && (
        <form method="post" action="/api/stripe/portal">
          <input type="hidden" name="slug" value={billingSlug} />
          <button
            type="submit"
            className="text-[0.8125rem] underline decoration-foreground/25 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
          >{t("dash.manageSubscription")}</button>
        </form>
      )}
    </div>
  );
}

export function Column({ children }: { children: ReactNode }) {
  return <div className="min-w-0 space-y-9">{children}</div>;
}
