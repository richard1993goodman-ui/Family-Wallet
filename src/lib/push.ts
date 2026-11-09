// Pure helpers for notifications; no server imports so they can be tested and used anywhere.

/** Features that send a phone push (everything else only shows a badge). Keys are the page route prefixes. */
export const PUSH_FEATURES = [
  { key: "messages", label: "New messages" },
  { key: "moments", label: "New photos and milestones" },
  { key: "log", label: "Daily updates" },
  { key: "planner", label: "Changes to the week plan" },
  { key: "incidents", label: "Incident reports" },
  { key: "timesheets", label: "Shifts to approve or reviewed" },
  { key: "leave", label: "Leave requests and answers" },
  { key: "handover", label: "Expenses and handover" },
  { key: "medication", label: "Medicine doses" },
  { key: "pettycash", label: "Petty cash" },
  { key: "checkin", label: "Check-ins" },
] as const;

export const isPushFeature = (key: string) => PUSH_FEATURES.some((f) => f.key === key);

/** True when `now` falls in the quiet window, which may wrap midnight (e.g. 21 to 7). */
export function inQuietHours(now: Date, tz: string, start: number | null, end: number | null): boolean {
  if (start === null || end === null || start === end) return false;
  let hour: number;
  try {
    hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now));
  } catch {
    hour = now.getUTCHours();
  }
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** Counts activity by feature that the other person made after this person last looked. */
export function countUnseen(
  role: "family" | "nanny",
  activity: { feature: string; actor: string; created_at: string }[],
  seen: { feature: string; seen_at: string }[],
): Record<string, number> {
  const seenAt = new Map(seen.map((s) => [s.feature, new Date(s.seen_at).getTime()]));
  const counts: Record<string, number> = {};
  for (const a of activity) {
    if (a.actor === role) continue;
    if (new Date(a.created_at).getTime() <= (seenAt.get(a.feature) ?? 0)) continue;
    counts[a.feature] = (counts[a.feature] ?? 0) + 1;
  }
  return counts;
}
