import { workingDayHours, type WorkingDay } from "./agreement.model";
import { rawShiftMinutes } from "./work-tools.model";

export type MonthEntry = {
  id: string;
  entry_date: string;
  time_label: string | null;
  end_time_label: string | null;
  title: string;
  child_name: string | null;
  entry_type: string;
  status: string;
  added_by: string;
  notes: string | null;
};

export type MonthLog = {
  id: string;
  log_date: string;
  activities: string | null;
  food: string | null;
  homework: string | null;
  mood: string | null;
  notes: string | null;
  tomorrow: string | null;
};

export type MonthShift = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  is_overnight: boolean;
  status: string;
  shift_type: string;
  notes: string | null;
};

export type MonthData = { entries: MonthEntry[]; logs: MonthLog[]; shifts: MonthShift[] };
export type MonthSchedule = { nannyId: string; nannyName: string; workingDays: WorkingDay[] };

export type MonthDay = {
  iso: string;
  inMonth: boolean;
  /** Agreed shifts for this weekday; empty when the regular shift is cancelled. */
  agreed: Array<{ nannyName: string; shift: WorkingDay }>;
  agreedHours: number;
  /** Hours from timesheet shifts that weren't declined. */
  loggedHours: number;
  cancelled: boolean;
  shifts: MonthShift[];
  logs: MonthLog[];
  parentNotes: MonthEntry[];
  nannyPlans: MonthEntry[];
};

const iso = (date: Date) => date.toISOString().slice(0, 10);

export const shiftRowHours = (s: MonthShift) =>
  Math.max(
    0,
    rawShiftMinutes({ startTime: s.start_time, endTime: s.end_time, isOvernight: s.is_overnight }) -
      Math.max(0, s.break_minutes || 0),
  ) / 60;

/** `month` is "YYYY-MM". Returns whole weeks (Monday first) covering it, plus totals for the month itself. */
export function buildMonth(month: string, data: MonthData, schedules: MonthSchedule[]) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const cursor = new Date(first);
  cursor.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
  const days: MonthDay[] = [];
  while (days.length % 7 !== 0 || iso(cursor).slice(0, 7) <= month) {
    const date = iso(cursor);
    const weekday = cursor.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
    const entries = data.entries.filter((e) => e.entry_date === date);
    const cancelled = entries.some(
      (e) => e.entry_type === "shift_change" && e.status === "cancelled",
    );
    const agreed = cancelled
      ? []
      : schedules.flatMap((s) => {
          const shift = s.workingDays.find((d) => d.day === weekday && d.enabled);
          return shift ? [{ nannyName: s.nannyName, shift }] : [];
        });
    const shifts = data.shifts.filter((s) => s.shift_date === date && s.status !== "declined");
    days.push({
      iso: date,
      inMonth: date.slice(0, 7) === month,
      agreed,
      agreedHours: agreed.reduce((sum, a) => sum + workingDayHours(a.shift), 0),
      loggedHours: shifts.reduce((sum, s) => sum + shiftRowHours(s), 0),
      cancelled,
      shifts,
      logs: data.logs.filter((l) => l.log_date === date),
      parentNotes: entries.filter((e) => e.added_by === "family"),
      nannyPlans: entries.filter((e) => e.added_by !== "family"),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const inMonth = days.filter((d) => d.inMonth);
  const sum = (pick: (d: MonthDay) => number) => inMonth.reduce((total, d) => total + pick(d), 0);
  return {
    days,
    totals: {
      agreedHours: sum((d) => d.agreedHours),
      loggedHours: sum((d) => d.loggedHours),
      updates: sum((d) => (d.logs.length ? 1 : 0)),
      parentNotes: sum((d) => d.parentNotes.length),
    },
  };
}

export function shiftMonth(month: string, by: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + by);
  return iso(date).slice(0, 7);
}
