import { cn } from "@/lib/utils";
import markUrl from "@/assets/family-wallet-mark.png";

/** The Family Wallet logo mark (two overlapping houses). */
export function LogoMark({ className }: { className?: string }) {
  return <img src={markUrl} alt="" aria-hidden="true" className={cn("h-7 w-7 flex-none object-contain", className)} />;
}

/** The fanlight over a London front door: the wallet's mark. */
export function FanlightMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("h-7 w-7 flex-none text-brand", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <path d="M3 23a13 13 0 0 1 26 0" />
      <path d="M11 23a5 5 0 0 1 10 0" />
      <path d="M16 18V10.5M12.5 19 8.2 13M19.5 19l4.3-6M11 21.6 5.6 18.8M21 21.6l5.4-2.8" />
      <path d="M2 23h28" />
      <path d="M8 23v6M24 23v6" />
    </svg>
  );
}

export function Wordmark({
  className,
  subline,
  logoUrl,
  logoAlt,
}: {
  className?: string;
  subline?: string | null | undefined;
  /** An agency's own logo replaces the fanlight mark when present. */
  logoUrl?: string | null | undefined;
  logoAlt?: string | null | undefined;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={logoAlt ?? "Agency logo"}
          className="h-9 w-auto max-w-[8rem] flex-none object-contain"
        />
      ) : (
        <LogoMark />
      )}
      <span className="min-w-0">
        <span className="heading-serif block truncate text-[1.1875rem] leading-none text-foreground">
          The Family Wallet
        </span>
        {subline && (
          <span className="mt-1 block truncate text-xs text-muted-foreground">{subline}</span>
        )}
      </span>
    </span>
  );
}
