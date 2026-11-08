import { formatPounds, type AllowanceUsage } from "@/lib/agency-plans";

const SALES_EMAIL =
  "mailto:richard@athletemannies.com?subject=Family%20Wallet%20for%20agencies%3A%20upgrade";

/** The agency's plan allowance: how many households are active this month, and what that costs. */
export function AllowanceCard({ usage }: { usage: AllowanceUsage }) {
  const bar =
    usage.level === "over" ? "bg-destructive" : usage.level === "near" ? "bg-warning" : "bg-brand";
  const places = (n: number) => `${n} place${n === 1 ? "" : "s"}`;

  return (
    <section
      aria-label="Plan allowance"
      className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-border sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {usage.planName} plan · active households this month
          </p>
          <p className="num heading-display mt-2 text-[2.75rem] leading-none text-foreground">
            {usage.used}
            <span className="text-[1.5rem] text-muted-foreground">
              {usage.allowance === null ? " active" : ` of ${usage.allowance}`}
            </span>
          </p>
        </div>
        {usage.basePence !== null && (
          <p className="text-sm text-muted-foreground sm:text-right">
            <span className="block text-base font-medium text-foreground">
              {formatPounds(usage.basePence + usage.extraPence)} a month
            </span>
            excl. VAT{usage.extraPence > 0 ? `, includes ${formatPounds(usage.extraPence)} extra` : ""}
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
          aria-label="Active households against your allowance"
        >
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${usage.percent}%` }} />
        </div>
      )}

      <p className="mt-4 text-sm text-foreground">
        {usage.level === "unlimited"
          ? "Your plan is priced to your agreement, with no fixed limit."
          : usage.level === "over"
            ? `${usage.over} household${usage.over === 1 ? "" : "s"} over your allowance. Each extra one adds to your monthly price.`
            : usage.level === "near"
              ? `${places(usage.remaining ?? 0)} left before extra households are charged.`
              : `${places(usage.remaining ?? 0)} left. A household counts once someone has opened its wallet in the last 30 days.`}
        {(usage.level === "near" || usage.level === "over") && (
          <>
            {" "}
            <a className="underline underline-offset-4" href={SALES_EMAIL}>
              Talk to us about a bigger plan
            </a>
            .
          </>
        )}
      </p>
    </section>
  );
}
