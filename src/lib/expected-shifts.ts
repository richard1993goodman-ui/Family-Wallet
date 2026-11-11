// What the timesheet expects for each day: the regular hours, with approved changes applied.
import type { WorkingDay } from "./agreement.model";
import { offPeriodOn, regularHoursApply, type WorkSchedule } from "./work-hours";

export type ShiftChange = {
  date: string;
  kind: "cancelled" | "changed";
  start: string | null;
  end: string | null;
  approval: "pending" | "approved" | "declined";
};

export type ExpectedShift = {
  date: string;
  startTime: string;
  endTime: string;
  source: "regular" | "amended";
};

const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;
const pad = (t: string) => (t.length === 4 ? `0${t}` : t);
const weekdayName = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });

function* datesBetween(from: string, to: string) {
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86400000) yield new Date(t).toISOString().slice(0, 10);
}

/**
 * Shifts to offer on the timesheet between two dates. Days off and holidays are skipped, a day already on the
 * timesheet is skipped, and a changed or cancelled shift only counts once it has been approved: until then the
 * regular hours stand.
 */
export function expectedShifts(opts: {
  from: string;
  to: string;
  days: WorkingDay[];
  schedule: WorkSchedule;
  changes: ShiftChange[];
  recorded: ReadonlySet<string>;
}): ExpectedShift[] {
  const out: ExpectedShift[] = [];
  for (const date of datesBetween(opts.from, opts.to)) {
    if (opts.recorded.has(date)) continue;
    if (offPeriodOn(opts.schedule, date)) continue;
    const approved = opts.changes.filter((c) => c.date === date && c.approval === "approved");
    if (approved.some((c) => c.kind === "cancelled")) continue;

    const changed = approved.find((c) => c.kind === "changed" && c.start && c.end && TIME.test(c.start) && TIME.test(c.end));
    if (changed) {
      out.push({ date, startTime: pad(changed.start!), endTime: pad(changed.end!), source: "amended" });
      continue;
    }
    if (!regularHoursApply(opts.schedule, date)) continue;
    const day = opts.days.find((d) => d.enabled && d.day === weekdayName(date));
    if (!day) continue;
    out.push({ date, startTime: day.startTime, endTime: day.endTime, source: "regular" });
    if (day.startTime2 && day.endTime2) out.push({ date, startTime: day.startTime2, endTime: day.endTime2, source: "regular" });
  }
  return out;
}
