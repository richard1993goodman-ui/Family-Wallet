import { describe, expect, it } from "vitest";
import { defaultWorkingDays } from "./agreement.model";
import { expectedShifts, type ShiftChange } from "./expected-shifts";
import { defaultSchedule } from "./work-hours";

// Monday 2 to Sunday 8 November 2026.
const days = defaultWorkingDays.map((d) =>
  d.day === "Monday" || d.day === "Tuesday"
    ? { ...d, enabled: true, startTime: "15:00", endTime: "19:00" }
    : d.day === "Wednesday"
      ? { ...d, enabled: true, startTime: "07:00", endTime: "09:00", startTime2: "15:00", endTime2: "19:00" }
      : { ...d, enabled: false },
);
const run = (changes: ShiftChange[] = [], recorded: string[] = [], schedule = defaultSchedule) =>
  expectedShifts({ from: "2026-11-02", to: "2026-11-08", days, schedule, changes, recorded: new Set(recorded) });

describe("expected timesheet shifts", () => {
  it("offers the regular hours for each working day, with split shifts as two lines", () => {
    const shifts = run();
    expect(shifts.map((s) => `${s.date} ${s.startTime}-${s.endTime}`)).toEqual([
      "2026-11-02 15:00-19:00",
      "2026-11-03 15:00-19:00",
      "2026-11-04 07:00-09:00",
      "2026-11-04 15:00-19:00",
    ]);
  });

  it("skips days already on the timesheet", () => {
    expect(run([], ["2026-11-03"]).some((s) => s.date === "2026-11-03")).toBe(false);
  });

  it("skips holidays and days off", () => {
    const schedule = { ...defaultSchedule, offPeriods: [{ label: "Half term", start: "2026-11-02", end: "2026-11-03" }] };
    expect(run([], [], schedule).map((s) => s.date)).toEqual(["2026-11-04", "2026-11-04"]);
  });

  it("uses an approved changed shift instead of the regular hours", () => {
    const shifts = run([{ date: "2026-11-02", kind: "changed", start: "16:30", end: "20:00", approval: "approved" }]);
    expect(shifts[0]).toMatchObject({ date: "2026-11-02", startTime: "16:30", endTime: "20:00", source: "amended" });
  });

  it("drops a day whose cancellation has been approved", () => {
    const shifts = run([{ date: "2026-11-02", kind: "cancelled", start: null, end: null, approval: "approved" }]);
    expect(shifts.some((s) => s.date === "2026-11-02")).toBe(false);
  });

  it("ignores a change until it is approved", () => {
    const pending: ShiftChange[] = [
      { date: "2026-11-02", kind: "changed", start: "10:00", end: "12:00", approval: "pending" },
      { date: "2026-11-03", kind: "cancelled", start: null, end: null, approval: "pending" },
      { date: "2026-11-04", kind: "cancelled", start: null, end: null, approval: "declined" },
    ];
    const shifts = run(pending);
    expect(shifts.find((s) => s.date === "2026-11-02")).toMatchObject({ startTime: "15:00", source: "regular" });
    expect(shifts.some((s) => s.date === "2026-11-03")).toBe(true);
    expect(shifts.some((s) => s.date === "2026-11-04")).toBe(true);
  });

  it("offers an approved extra day that is not a regular working day", () => {
    const shifts = run([{ date: "2026-11-06", kind: "changed", start: "09:00", end: "13:00", approval: "approved" }]);
    expect(shifts.some((s) => s.date === "2026-11-06" && s.source === "amended")).toBe(true);
  });
});
