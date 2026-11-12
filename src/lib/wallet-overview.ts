import { shiftHours } from "./work-tools.model";

type ShiftRow = {
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number | null;
  is_overnight: boolean | null;
  hourly_rate: number | string | null;
  status: string;
};

/** Hours and pay approved so far this month, from the timesheet. Only approved shifts count. */
export function monthApproved(shifts: readonly ShiftRow[], todayIso: string) {
  const month = todayIso.slice(0, 7);
  let hours = 0;
  let amount = 0;
  let count = 0;
  for (const s of shifts) {
    if (s.status !== "approved" || !s.shift_date.startsWith(month)) continue;
    const h = shiftHours({
      shiftDate: s.shift_date,
      startTime: s.start_time,
      endTime: s.end_time,
      breakMinutes: s.break_minutes ?? 0,
      isOvernight: !!s.is_overnight,
      hourlyRate: Number(s.hourly_rate ?? 0),
    });
    hours += h;
    amount += h * Math.max(0, Number(s.hourly_rate ?? 0));
    count += 1;
  }
  return { hours: Math.round(hours * 10) / 10, amount: Math.round(amount * 100) / 100, count };
}

/** Initials for an avatar: first letters of up to two words, so "The Harringtons" gives "TH" and "Jess" gives "J". */
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** How to show a child's allergy field: a warning when something is listed, a quiet "none" when it says so, nothing when blank. */
export function allergyNote(
  text: string | null | undefined,
): { kind: "warn" | "none"; text: string } | null {
  const v = (text ?? "").trim();
  if (!v) return null;
  if (/^(none|no|nil|n\/a|no allergies)\b/i.test(v)) return { kind: "none", text: v };
  return { kind: "warn", text: v };
}
