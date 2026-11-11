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
    const s2 = match?.startTime2;
    const e2 = match?.endTime2;
    if (!s2 && !e2) return { day: base.day, enabled: true, startTime, endTime };
    if (!s2 || !e2 || !TIME.test(s2) || !TIME.test(e2)) throw new Error(`Check the second shift times for ${base.day}.`);
    if (e2 <= s2) throw new Error(`${base.day}'s second shift should finish after it starts.`);
    if (s2 < endTime) throw new Error(`${base.day}'s second shift should start after the first one ends.`);
    return { day: base.day, enabled: true, startTime, endTime, startTime2: s2, endTime2: e2 };
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
  schedule?: Pick<WorkSchedule, "hoursSource"> | null,
): WorkingDay[] {
  // A parent who chose their own shift pattern over the agreement's hours keeps it.
  if (schedule?.hoursSource === "manual" && manualDays && hasHours(manualDays)) return manualDays;
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
  /** Whose hours the calendar uses when the family also has an agreement: the agreement's, or the parent's own pattern. */
  hoursSource: "agreement" | "manual";
};

export const defaultSchedule: WorkSchedule = {
  arrangement: "full_time",
  repeat: true,
  onlyWeek: null,
  offPeriods: [],
  hoursSource: "agreement",
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
    hoursSource: raw.hoursSource === "manual" ? "manual" : "agreement",
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

/* ---------------- Key dates: bank holidays, Christmas and Easter ---------------- */

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const addDaysUtc = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
/** First Monday on or after this date. */
const mondayOnOrAfter = (d: Date) => addDaysUtc(d, (8 - d.getUTCDay()) % 7);
/** Last Monday on or before this date. */
const lastMondayOnOrBefore = (d: Date) => addDaysUtc(d, -((d.getUTCDay() + 6) % 7));

/** Easter Sunday (Gregorian), by the anonymous algorithm. */
export function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

/**
 * The England and Wales bank holidays for a year, with the Christmas, Boxing Day and New Year's Day
 * substitutes when they fall on a weekend. Dates in Scotland and Northern Ireland differ, and the family can edit every one.
 */
export function bankHolidays(year: number): OffPeriod[] {
  const easter = easterSunday(year);
  const dow = (d: Date) => d.getUTCDay();
  const out: OffPeriod[] = [];
  const add = (label: string, d: Date) => out.push({ label, start: iso(d), end: iso(d) });

  // New Year's Day: the next Monday if it falls on a weekend.
  const ny = utc(year, 1, 1);
  add("New Year's Day", dow(ny) === 6 ? addDaysUtc(ny, 2) : dow(ny) === 0 ? addDaysUtc(ny, 1) : ny);
  add("Good Friday", addDaysUtc(easter, -2));
  add("Easter Monday", addDaysUtc(easter, 1));
  add("Early May bank holiday", mondayOnOrAfter(utc(year, 5, 1)));
  add("Spring bank holiday", lastMondayOnOrBefore(utc(year, 5, 31)));
  add("Summer bank holiday", lastMondayOnOrBefore(utc(year, 8, 31)));

  // Christmas Day and Boxing Day: when either lands on a weekend, the next free weekdays stand in.
  const xd = dow(utc(year, 12, 25));
  const christmasDay = xd === 0 ? utc(year, 12, 27) : xd === 6 ? utc(year, 12, 27) : utc(year, 12, 25);
  const boxingDay = xd === 5 || xd === 6 ? utc(year, 12, 28) : utc(year, 12, 26);
  add("Christmas Day", christmasDay);
  add("Boxing Day", boxingDay);
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** Key dates from today for the next two calendar years, so the calendar has the holidays coming up. */
export function keyDatePresets(today = new Date()): OffPeriod[] {
  const from = iso(today);
  const year = today.getUTCFullYear();
  return [...bankHolidays(year), ...bankHolidays(year + 1)].filter((p) => p.end >= from);
}
