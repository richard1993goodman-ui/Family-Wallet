// The lock, export and delete lifecycle for a wallet that stops being funded or is cancelled. Pure, so every rule is
// easy to test before anything is allowed to run against real data.
//
// The rule: a wallet that goes from active to suspended or cancelled is locked at once. The household then has 30 days
// to export its data, gets reminders on the way, and only then is its data permanently deleted.

export const EXPORT_WINDOW_DAYS = 30;
/** Days after locking on which a reminder email goes out. The last one is the final warning. */
export const REMINDER_DAYS = [0, 14, 25, 29] as const;
export type ReminderDay = (typeof REMINDER_DAYS)[number];
export const FINAL_REMINDER: ReminderDay = 29;

const DAY = 24 * 60 * 60 * 1000;
export const addDays = (from: Date, days: number) => new Date(from.getTime() + days * DAY);
export const deleteAfterFor = (lockedAt: Date) => addDays(lockedAt, EXPORT_WINDOW_DAYS);
export const isLockedStatus = (status: string | null | undefined) =>
  status === "suspended" || status === "cancelled";

/** Whether the name typed to confirm deletion is the family's name (ignoring case and extra spaces). */
export function deletionConfirmed(typed: string, familyName: string) {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(typed).length > 0 && norm(typed) === norm(familyName);
}

/** Whole days left before deletion, never below zero. */
export function daysLeft(now: Date, deleteAfter: Date) {
  return Math.max(0, Math.ceil((deleteAfter.getTime() - now.getTime()) / DAY));
}

/**
 * The reminder to send now, or null. Only the most recent one that is due and not yet sent, so a household locked a
 * long time ago (or a missed run) gets one clear email, not a burst of old ones.
 */
export function dueReminder(
  now: Date,
  lockedAt: Date,
  sent: readonly number[],
): ReminderDay | null {
  const elapsed = Math.floor((now.getTime() - lockedAt.getTime()) / DAY);
  const due = REMINDER_DAYS.filter((d) => d <= elapsed && !sent.includes(d));
  return due.length ? due[due.length - 1]! : null;
}

export type PurgeInput = {
  now: Date;
  status: string | null;
  deleteAfter: Date | null;
  hold: boolean;
  noticesSent: readonly number[];
  /** The owner has looked at a household that could not be emailed and confirmed it may be deleted. */
  ownerConfirmed: boolean;
};
export type PurgeDecision = {
  purge: boolean;
  reason: "not_locked" | "window_open" | "on_hold" | "no_final_notice" | "ready";
};

/**
 * Whether a locked household's data may now be permanently deleted. Deletion needs all of: still locked, the 30 days
 * over, no hold, and the final warning actually sent (or the owner's explicit confirmation when it could not be).
 */
export function purgeDecision(i: PurgeInput): PurgeDecision {
  if (!isLockedStatus(i.status) || !i.deleteAfter) return { purge: false, reason: "not_locked" };
  if (i.hold) return { purge: false, reason: "on_hold" };
  if (i.now.getTime() < i.deleteAfter.getTime()) return { purge: false, reason: "window_open" };
  if (!i.noticesSent.includes(FINAL_REMINDER) && !i.ownerConfirmed)
    return { purge: false, reason: "no_final_notice" };
  return { purge: true, reason: "ready" };
}

const esc = (t: string) =>
  t.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** The reminder emails. Generic by design: no names of children, no wording from agreements, no codes. */
export function buildLifecycleEmail(d: {
  day: ReminderDay;
  familyName: string;
  deleteOn: Date;
  daysLeft: number;
  exportUrl: string;
}) {
  const date = d.deleteOn.toISOString().slice(0, 10);
  const subject =
    d.day === 0
      ? "Your Family Wallet is locked: download your data"
      : d.day === FINAL_REMINDER
        ? "Final reminder: your Family Wallet is deleted tomorrow"
        : `Your Family Wallet is deleted in ${d.daysLeft} days`;
  const intro =
    d.day === 0
      ? `The Family Wallet for ${d.familyName} is now locked. You have until ${date} to download a copy of your data. After that it is permanently deleted and cannot be recovered.`
      : d.day === FINAL_REMINDER
        ? `The Family Wallet for ${d.familyName} will be permanently deleted on ${date}, tomorrow. This is your last chance to download a copy of your data.`
        : `The Family Wallet for ${d.familyName} will be permanently deleted on ${date}, in ${d.daysLeft} days. You can still download a copy of your data.`;
  const text = `${intro}\n\nDownload your data: ${d.exportUrl}\n(You'll be asked for your wallet access code.)\n\nIf the wallet was locked by mistake, or you want to keep it, reply to this email.`;
  const html = `<p>${esc(intro)}</p><p><a href="${esc(d.exportUrl)}" style="display:inline-block;background:#1a382b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Download my data</a></p><p style="color:#57534e;font-size:14px">You'll be asked for your wallet access code. If the wallet was locked by mistake, or you want to keep it, reply to this email.</p>`;
  return { subject, html, text };
}

export type LockedHousehold = {
  id: string;
  slug: string;
  familyName: string;
  email: string | null;
  status: string | null;
  lockedAt: Date | null;
  deleteAfter: Date | null;
  hold: boolean;
  notices: readonly number[];
  ownerConfirmed: boolean;
};
export type LifecycleStep =
  | { id: string; action: "remind"; day: ReminderDay }
  | { id: string; action: "purge" }
  | { id: string; action: "skip"; reason: string };

/** What the daily job should do for each locked household. A purge outranks a reminder; holds and missing emails skip. */
export function planLifecycle(now: Date, households: readonly LockedHousehold[]): LifecycleStep[] {
  return households.map((h): LifecycleStep => {
    if (h.hold) return { id: h.id, action: "skip", reason: "on_hold" };
    const decision = purgeDecision({
      now,
      status: h.status,
      deleteAfter: h.deleteAfter,
      hold: h.hold,
      noticesSent: h.notices,
      ownerConfirmed: h.ownerConfirmed,
    });
    if (decision.purge) return { id: h.id, action: "purge" };
    if (decision.reason === "not_locked" || !h.lockedAt)
      return { id: h.id, action: "skip", reason: decision.reason };
    const day = dueReminder(now, h.lockedAt, h.notices);
    if (day === null)
      return {
        id: h.id,
        action: "skip",
        reason: decision.reason === "no_final_notice" ? "no_final_notice" : "nothing_due",
      };
    if (!h.email) return { id: h.id, action: "skip", reason: "no_email" };
    return { id: h.id, action: "remind", day };
  });
}
