import { cn } from "@/lib/utils";

/**
 * The Family Wallet logo mark. Drawn as an SVG so it needs no image file.
 * (Lovable's version used a PNG, src/assets/family-wallet-mark.png, which was not carried over.)
 */
export function LogoMark({ className }: { className?: string }) {
  return <HouseMark className={cn("h-7 w-7", className)} />;
}

/** Two homes, one wallet: a big green house sheltering a smaller one. */
export function HouseMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="190 190 650 630"
      aria-hidden="true"
      className={cn("h-8 w-8 flex-none", className)}
      fill="none"
      strokeWidth="100"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path
        className="text-brand"
        stroke="currentColor"
        d="M253 752V450C253 425 262 405 285 388L440 278Q480 250 520 278L630 360C650 375 657 392 657 415V752Z"
      />
      <path
        className="text-foreground"
        stroke="currentColor"
        d="M480 755V575C480 555 490 540 505 530L610 455Q632 440 654 455L735 515C752 527 780 545 780 590V755Z"
      />
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
  /** An agency's own logo replaces the house mark when present. */
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
        <HouseMark />
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
