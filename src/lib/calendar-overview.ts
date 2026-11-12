import { workingDayHours, type WorkingDay } from "./agreement.model";

/** Hours and days a week the regular schedule covers, from the enabled working days. */
export function weeklyScheduled(days: readonly WorkingDay[] | null | undefined) {
  const enabled = (days ?? []).filter((d) => d.enabled);
  const hours = enabled.reduce((total, d) => total + workingDayHours(d), 0);
  return { hours: Math.round(hours * 10) / 10, days: enabled.length };
}

export type ReviewCounts = { shiftsPending: number; leavePending: number; expensesPending: number };

/** What is waiting for a decision, in the order people act on it. Empty when nothing is. */
export function reviewRows(counts: ReviewCounts) {
  return [
    { key: "hours" as const, count: counts.shiftsPending },
    { key: "leave" as const, count: counts.leavePending },
    { key: "expenses" as const, count: counts.expensesPending },
  ].filter((row) => row.count > 0);
}
