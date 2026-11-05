import { Link } from "@tanstack/react-router";
import { ChevronRight, Phone } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import type { WalletPath } from "@/components/wallet-nav";
import { cn } from "@/lib/utils";

/** Wallet pages the home screen links to, including ones that aren't in the nav. */
export type HomeLinkPath =
  | WalletPath
  | "/curation/$slug"
  | "/perks/$slug"
  | "/playbooks/$slug"
  | "/support/$slug"
  | "/checkin/$slug"
  | "/terms/$slug";

type Icon = ComponentType<{ className?: string }>;

/** A section's colour, used on its icon tiles (see data-tint in styles.css). */
export type Tint = "sage" | "apricot" | "sky" | "lilac" | "butter" | "rose";

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3 px-0.5">
      <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-foreground">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function HubTile({
  slug,
  to,
  icon: Icon,
  title,
  subtitle,
}: {
  slug: string;
  to: HomeLinkPath;
  icon: Icon;
  title: string;
  subtitle: string;
}) {
  return (
    <Link to={to} params={{ slug }} className="ios-row">
      <span className="ios-icon">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}

export function DocTile({
  icon: Icon,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  icon: Icon;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="ios-row w-full text-left disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className="ios-icon">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

export function ContactRow({
  label,
  contact,
}: {
  label: string;
  contact: { name: string; relationship: string | null; phone: string };
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate font-medium text-foreground">
          {contact.name}
          {contact.relationship && (
            <span className="font-normal text-muted-foreground"> · {contact.relationship}</span>
          )}
        </span>
      </span>
      {contact.phone && (
        <a
          href={`tel:${contact.phone.replace(/\s+/g, "")}`}
          className="inline-flex h-9 flex-none items-center gap-1.5 rounded-full border border-input bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
          aria-label={`Call ${contact.name}`}
        >
          <Phone className="h-3.5 w-3.5" /> Call
        </a>
      )}
    </div>
  );
}

/** A row in an action list: icon, label, optional detail and a count or status on the right. */
export function ActionRow({
  slug,
  to,
  icon: Icon,
  title,
  detail,
  badge,
  cta,
  tone = "default",
}: {
  slug: string;
  to: HomeLinkPath;
  icon: Icon;
  title: string;
  detail?: string | undefined;
  badge?: ReactNode;
  /** Names the action on the right in place of the chevron, e.g. "Review". */
  cta?: string;
  tone?: "default" | "attention" | "done";
}) {
  return (
    <Link
      to={to}
      params={{ slug }}
      className="group flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-raised active:bg-accent"
    >
      <span
        className="ios-icon"
        data-tint={tone === "attention" ? "apricot" : tone === "done" ? "sage" : "sky"}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">{title}</span>
        {detail && <span className="block truncate text-sm text-muted-foreground">{detail}</span>}
      </span>
      {badge}
      {cta ? (
        <span className="hidden h-8 flex-none items-center rounded-full border border-input bg-card px-3.5 text-sm font-medium text-foreground transition-colors group-hover:border-foreground/30 sm:inline-flex">
          {cta}
        </span>
      ) : null}
      <ChevronRight
        className={cn(
          "h-4 w-4 flex-none text-muted-foreground/70 transition-transform group-hover:translate-x-0.5",
          cta && "sm:hidden",
        )}
      />
    </Link>
  );
}

export function CountBadge({ count }: { count: number }) {
  return (
    <span className="num flex h-6 min-w-6 items-center justify-center rounded-full bg-tint-apricot px-2 text-[0.8125rem] font-semibold text-tint-apricot-ink">
      {count}
    </span>
  );
}

/** Large tap target for the nanny's everyday actions. */
export function QuickAction({
  slug,
  to,
  icon: Icon,
  label,
  status,
  done,
  tint = "sage",
}: {
  slug: string;
  to: HomeLinkPath;
  icon: Icon;
  label: string;
  status?: string | undefined;
  done?: boolean | undefined;
  tint?: Tint;
}) {
  return (
    <Link
      to={to}
      params={{ slug }}
      data-tint={tint}
      className={cn(
        "surface-card flex min-h-32 flex-col justify-between gap-3 p-4 transition-[border-color,transform] duration-150 ease-out hover:border-foreground/25 active:scale-[0.98] motion-reduce:active:scale-100",
      )}
    >
      <span className="ios-icon h-10 w-10">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-medium leading-tight text-foreground">{label}</span>
        {status && (
          <span
            className={cn("mt-0.5 block text-xs", done ? "text-brand" : "text-muted-foreground")}
          >
            {status}
          </span>
        )}
      </span>
    </Link>
  );
}
