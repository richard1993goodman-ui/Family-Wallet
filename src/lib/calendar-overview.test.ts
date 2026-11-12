import { describe, expect, it } from "vitest";
import type { WorkingDay } from "./agreement.model";
import { reviewRows, weeklyScheduled } from "./calendar-overview";

const day = (over: Partial<WorkingDay>): WorkingDay =>
  ({ day: "Monday", enabled: true, startTime: "08:00", endTime: "17:00", ...over }) as WorkingDay;

describe("the regular week", () => {
  it("adds up the enabled days, including a split shift", () => {
    expect(
      weeklyScheduled([
        day({}),
        day({
          day: "Tuesday",
          startTime: "07:30",
          endTime: "11:30",
          startTime2: "15:00",
          endTime2: "19:00",
        }),
      ]),
    ).toEqual({
      hours: 17,
      days: 2,
    });
  });

  it("ignores days that are switched off, and copes with nothing set", () => {
    expect(weeklyScheduled([day({ enabled: false })])).toEqual({ hours: 0, days: 0 });
    expect(weeklyScheduled(undefined)).toEqual({ hours: 0, days: 0 });
    expect(weeklyScheduled([])).toEqual({ hours: 0, days: 0 });
  });

  it("rounds to one decimal place", () => {
    expect(weeklyScheduled([day({ startTime: "09:00", endTime: "09:20" })]).hours).toBe(0.3);
  });
});

describe("what is waiting for approval", () => {
  it("lists only what has a count, hours first", () => {
    expect(reviewRows({ shiftsPending: 2, leavePending: 0, expensesPending: 1 })).toEqual([
      { key: "hours", count: 2 },
      { key: "expenses", count: 1 },
    ]);
  });

  it("is empty when nothing is waiting", () => {
    expect(reviewRows({ shiftsPending: 0, leavePending: 0, expensesPending: 0 })).toEqual([]);
  });
});
