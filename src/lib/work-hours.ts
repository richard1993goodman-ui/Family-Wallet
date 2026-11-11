import { defaultWorkingDays, workingDayHours, type WorkingDay } from "./agreement.model";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Cleans submitted hours into exactly seven weekdays, Monday first. Throws a plain message on bad times. */
export function cleanWorkingDays(input: unknown): WorkingDay[] {
  const given = Array.isArray(input) ? (input as Partial<WorkingDay>[]) : [];
  return defaultWorkingDays.map((base) => {
    const match = given.find((d) => d?.day === base.day);
    const enabled = match?.enabled === true;
    const startTime = match?.startTime ?? base.startTime;
    const endTime = match?.endTime ?? base.endTime;
    if (!enabled) return { ...base, enabled: false };
    if (!TIME.test(startTime) || !TIME.test(endTime))
      throw new Error(`Check the times for ${base.day}.`);
    if (endTime <= startTime) throw new Error(`${base.day} should finish after it starts.`);
    return { day: base.day, enabled: true, startTime, endTime };
  });
}

export const weeklyHours = (days: WorkingDay[]) =>
  days.filter((d) => d.enabled).reduce((sum, d) => sum + workingDayHours(d), 0);

export const hasHours = (days: WorkingDay[] | null | undefined) =>
  (days ?? []).some((d) => d.enabled);

/**
 * Which hours the week shows for a nanny: the agreement's days when the agreement is in use and has some,
 * otherwise the hours the parent typed in, otherwise whatever the agreement holds.
 */
export function effectiveWorkingDays(
  agreementsOn: boolean,
  agreementDays: WorkingDay[],
  manualDays: WorkingDay[] | null,
): WorkingDay[] {
  if (agreementsOn && hasHours(agreementDays)) return agreementDays;
  return manualDays ?? agreementDays;
}

export type OffPeriod = { label: string; start: string; end: string };
export type WorkSchedule = {
  /** Full time works all year; term time is off in the school holidays (listed in offPeriods). */
  arrangement: "full_time" | "term_time";
  /** True: the weekly hours repeat every week. False: they apply to one week only (onlyWeek, a Monday). */
  repeat: boolean;
  onlyWeek: string | null;
  offPeriods: OffPeriod[];
};

export const defaultSchedule: WorkSchedule = {
  arrangement: "full_time",
  repeat: true,
  onlyWeek: null,
  offPeriods: [],
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: unknown): s is string =>
  typeof s === "string" && ISO.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export function mondayOfIso(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Cleans a submitted schedule. Missing or old data becomes "full time, repeats every week, nothing off". */
export function cleanSchedule(input: unknown): WorkSchedule {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<WorkSchedule>;
  const repeat = raw.repeat !== false;
  if (!repeat && !validDate(raw.onlyWeek))
    throw new Error("Choose which week these hours are for.");
  const periods = Array.isArray(raw.offPeriods) ? raw.offPeriods : [];
  if (periods.length > 60)
    throw new Error("That's too many holiday dates. Remove some and try again.");
  const offPeriods = periods.map((p) => {
    const label =
      String(p?.label ?? "")
        .trim()
        .slice(0, 60) || "Time off";
    if (!validDate(p?.start) || !validDate(p?.end))
      throw new Error(`Check the dates for ${label}.`);
    if (p.end < p.start) throw new Error(`${label} should end on or after the day it starts.`);
    return { label, start: p.start, end: p.end };
  });
  return {
    arrangement: raw.arrangement === "term_time" ? "term_time" : "full_time",
    repeat,
    onlyWeek: repeat ? null : mondayOfIso(raw.onlyWeek as string),
    offPeriods: offPeriods.sort((a, b) => a.start.localeCompare(b.start)),
  };
}

/** The holiday, inset day or other time off covering this date, if any. */
export const offPeriodOn = (schedule: WorkSchedule, iso: string) =>
  schedule.offPeriods.find((p) => p.start <= iso && iso <= p.end) ?? null;

/** Do the regular weekly hours apply on this date? (Repeat-every-week, or the chosen week only.) */
export const regularHoursApply = (schedule: WorkSchedule, iso: string) =>
  schedule.repeat || schedule.onlyWeek === mondayOfIso(iso);

/**
 * Typical England school holidays for 2026/27. Councils and schools differ, and the family can edit every
 * date, so these are a starting point, not a promise.
 */
export const termPresets: OffPeriod[] = [
  { label: "Christmas holidays", start: "2026-12-21", end: "2027-01-01" },
  { label: "February half term", start: "2027-02-15", end: "2027-02-19" },
  { label: "Easter holidays", start: "2027-03-29", end: "2027-04-09" },
  { label: "May half term", start: "2027-05-31", end: "2027-06-04" },
  { label: "Summer holidays", start: "2027-07-26", end: "2027-09-03" },
];
