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
    if (!TIME.test(startTime) || !TIME.test(endTime)) throw new Error(`Check the times for ${base.day}.`);
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

export const hasHours = (days: WorkingDay[] | null | undefined) => (days ?? []).some((d) => d.enabled);

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
