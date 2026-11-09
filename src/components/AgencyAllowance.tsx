import { formatPounds, type AllowanceUsage } from "@/lib/agency-plans";
import { onMailtoClick } from "@/lib/mailto";
import { CONTACT_EMAIL } from "@/lib/site";

const SALES_EMAIL = `mailto:${CONTACT_EMAIL}?subject=Family%20Wallet%20for%20agencies%3A%20more%20seats`;

/** The agency's seats: one seat per active family wallet. Cancelling a family frees its seat. */
export function AllowanceCard({ usage }: { usage: AllowanceUsage }) {
  const bar =
    usage.level === "over" ? "bg-destructive" : usage.level === "near" ? "bg-warning" : "bg-brand";
  const seats = (n: number) => `${n} seat${n === 1 ? "" : "s"}`;

  return (
    <section
      aria-label="Seats"
      className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-border sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {usage.planName} plan · seats used
          </p>
          <p className="num heading-display mt-2 text-[2.75rem] leading-none text-foreground">
            {usage.used}
            <span className="text-[1.5rem] text-muted-foreground">
              {usage.allowance === null ? " in use" : ` of ${usage.allowance}`}
            </span>
          </p>
        </div>
        {usage.basePence !== null && (
          <p className="text-sm text-muted-foreground sm:text-right">
            <span className="block text-base font-medium text-foreground">
              {formatPounds(usage.basePence)} a month
            </span>
            excl. VAT
          </p>
        )}
      </div>

      {usage.allowance !== null && (
        <div
          className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={usage.allowance}
          aria-valuenow={Math.min(usage.used, usage.allowance)}
          aria-label="Seats used"
        >
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${usage.percent}%` }} />
        </div>
      )}

      <p className="mt-4 text-sm text-foreground">
        {usage.level === "unlimited"
          ? "Your plan is priced to your agreement, with no fixed limit."
          : (usage.remaining ?? 0) === 0
            ? "All your seats are in use. Cancel a family to free a seat, or add more seats."
            : usage.level === "near"
              ? `${seats(usage.remaining ?? 0)} left.`
              : `${seats(usage.remaining ?? 0)} left. Each family wallet you add uses one seat.`}
        {(usage.level === "near" || usage.level === "over" || (usage.remaining ?? 1) === 0) && (
          <>
            {" "}
            <a className="underline underline-offset-4" href={SALES_EMAIL} onClick={onMailtoClick}>
              Talk to us about more seats
            </a>
            .
          </>
        )}
      </p>
    </section>
  );
}
