export type LiveInSettings = {
  weeklyPocketMoney: number;
  maxWeeklyHours: number;
  daysOffPerWeek: number;
  roomAndBoard: string;
  houseRules: string;
  studySchedule: string;
};

export type LiveInWeek = {
  id: string;
  weekStart: string;
  hoursWorked: number;
  daysOff: number;
  pocketMoneyPaid: boolean;
  note: string | null;
};

export type LiveInData =
  | { upgrade: true; access: "family" | "nanny" }
  | { upgrade?: false; access: "family" | "nanny"; settings: LiveInSettings; weeks: LiveInWeek[] };

export const DEFAULT_LIVE_IN: LiveInSettings = {
  weeklyPocketMoney: 0,
  maxWeeklyHours: 30,
  daysOffPerWeek: 2,
  roomAndBoard: "",
  houseRules: "",
  studySchedule: "",
};

/** Flags a week that goes over the agreed hours cap or gives fewer days off than agreed. */
export function weekWarnings(week: { hoursWorked: number; daysOff: number }, s: LiveInSettings): string[] {
  const out: string[] = [];
  if (week.hoursWorked > s.maxWeeklyHours) out.push(`${week.hoursWorked - s.maxWeeklyHours}h over the ${s.maxWeeklyHours}h cap`);
  if (week.daysOff < s.daysOffPerWeek) out.push(`only ${week.daysOff} of ${s.daysOffPerWeek} days off`);
  return out;
}

/** Monday of the week containing the given ISO date. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
