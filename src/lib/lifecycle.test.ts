import { describe, expect, it } from "vitest";
import {
  addDays,
  buildLifecycleEmail,
  daysLeft,
  deleteAfterFor,
  dueReminder,
  FINAL_REMINDER,
  isLockedStatus,
  purgeDecision,
  REMINDER_DAYS,
} from "./lifecycle";

const locked = new Date("2026-11-01T09:00:00Z");

describe("the 30-day window", () => {
  it("ends exactly 30 days after locking", () => {
    expect(deleteAfterFor(locked).toISOString()).toBe("2026-12-01T09:00:00.000Z");
  });
  it("counts whole days left and never goes negative", () => {
    expect(daysLeft(addDays(locked, 10), deleteAfterFor(locked))).toBe(20);
    expect(daysLeft(addDays(locked, 40), deleteAfterFor(locked))).toBe(0);
  });
  it("treats suspended and cancelled as locked, and nothing else", () => {
    expect(isLockedStatus("suspended")).toBe(true);
    expect(isLockedStatus("cancelled")).toBe(true);
    expect(isLockedStatus("active")).toBe(false);
    expect(isLockedStatus(null)).toBe(false);
  });
});

describe("reminders", () => {
  it("sends the lock notice straight away, then on days 14, 25 and the day before deletion", () => {
    expect(REMINDER_DAYS).toEqual([0, 14, 25, 29]);
    expect(dueReminder(locked, locked, [])).toBe(0);
    expect(dueReminder(addDays(locked, 13), locked, [0])).toBeNull();
    expect(dueReminder(addDays(locked, 14), locked, [0])).toBe(14);
    expect(dueReminder(addDays(locked, 25), locked, [0, 14])).toBe(25);
    expect(dueReminder(addDays(locked, 29), locked, [0, 14, 25])).toBe(FINAL_REMINDER);
  });
  it("sends one reminder at a time and never repeats one", () => {
    expect(dueReminder(addDays(locked, 14), locked, [0, 14])).toBeNull();
  });
  it("after a missed run, sends only the most recent reminder due, not a burst", () => {
    expect(dueReminder(addDays(locked, 26), locked, [])).toBe(25);
  });
});

describe("when deletion is allowed", () => {
  const base = {
    now: addDays(locked, 31),
    status: "cancelled",
    deleteAfter: deleteAfterFor(locked),
    hold: false,
    noticesSent: [0, 14, 25, 29],
    ownerConfirmed: false,
  };

  it("is allowed only when locked, the window is over, no hold and the final notice was sent", () => {
    expect(purgeDecision(base)).toEqual({ purge: true, reason: "ready" });
  });
  it("waits while the 30 days are still running", () => {
    expect(purgeDecision({ ...base, now: addDays(locked, 29) })).toEqual({
      purge: false,
      reason: "window_open",
    });
  });
  it("never deletes an active wallet, even with a stale date", () => {
    expect(purgeDecision({ ...base, status: "active" })).toEqual({
      purge: false,
      reason: "not_locked",
    });
    expect(purgeDecision({ ...base, deleteAfter: null })).toEqual({
      purge: false,
      reason: "not_locked",
    });
  });
  it("respects a hold", () => {
    expect(purgeDecision({ ...base, hold: true })).toEqual({ purge: false, reason: "on_hold" });
  });
  it("refuses when the final warning never went out, unless the owner confirms", () => {
    expect(purgeDecision({ ...base, noticesSent: [0, 14, 25] })).toEqual({
      purge: false,
      reason: "no_final_notice",
    });
    expect(purgeDecision({ ...base, noticesSent: [], ownerConfirmed: true })).toEqual({
      purge: true,
      reason: "ready",
    });
  });
});

describe("reminder emails", () => {
  const args = {
    familyName: "Harrington",
    deleteOn: deleteAfterFor(locked),
    daysLeft: 16,
    exportUrl: "https://familywallet.io/export/harrington-ab12",
  };
  it("tell the household the date and where to download, without any code or private detail", () => {
    for (const day of REMINDER_DAYS) {
      const mail = buildLifecycleEmail({ ...args, day });
      expect(mail.text).toContain("2026-12-01");
      expect(mail.text).toContain("https://familywallet.io/export/harrington-ab12");
      expect(mail.text.toLowerCase()).not.toMatch(/access code: [a-z0-9]{6}/);
    }
  });
  it("make the last one unmistakable", () => {
    expect(buildLifecycleEmail({ ...args, day: 29 }).subject).toContain("deleted tomorrow");
    expect(buildLifecycleEmail({ ...args, day: 0 }).subject).toContain("locked");
    expect(buildLifecycleEmail({ ...args, day: 14 }).subject).toContain("16 days");
  });
  it("escape the family name", () => {
    expect(buildLifecycleEmail({ ...args, day: 0, familyName: "<b>x</b>" }).html).not.toContain(
      "<b>x</b>",
    );
  });
});

import { planLifecycle, type LockedHousehold } from "./lifecycle";

describe("the daily plan", () => {
  const house = (over: Partial<LockedHousehold> = {}): LockedHousehold => ({
    id: "a", slug: "a-1", familyName: "A", email: "a@example.com", status: "cancelled",
    lockedAt: locked, deleteAfter: deleteAfterFor(locked), hold: false, notices: [], ownerConfirmed: false, ...over,
  });
  it("sends the lock notice to a newly locked household", () => {
    expect(planLifecycle(locked, [house()])).toEqual([{ id: "a", action: "remind", day: 0 }]);
  });
  it("does nothing between reminders", () => {
    expect(planLifecycle(addDays(locked, 3), [house({ notices: [0] })])[0]).toMatchObject({ action: "skip", reason: "nothing_due" });
  });
  it("skips held households and ones with no email", () => {
    expect(planLifecycle(locked, [house({ hold: true })])[0]).toMatchObject({ reason: "on_hold" });
    expect(planLifecycle(locked, [house({ email: null })])[0]).toMatchObject({ reason: "no_email" });
  });
  it("purges only after the window with the final notice sent", () => {
    const late = addDays(locked, 31);
    expect(planLifecycle(late, [house({ notices: [0, 14, 25, 29] })])[0]).toEqual({ id: "a", action: "purge" });
    expect(planLifecycle(late, [house({ notices: [0, 14, 25] })])[0]).toMatchObject({ action: "remind", day: 29 });
  });
  it("never touches an active wallet", () => {
    expect(planLifecycle(locked, [house({ status: "active", deleteAfter: null, lockedAt: null })])[0]).toMatchObject({ action: "skip" });
  });
});
