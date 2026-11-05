import { describe, expect, it } from "vitest";
import { calculateHoliday, defaultWorkingDays, normalizeAgreement, rotaWeekFor } from "./agreement.model";

const on = (days: string[]) =>
  defaultWorkingDays.map((d) => ({ ...d, enabled: days.includes(d.day), startTime: "15:00", endTime: "19:00" }));

describe("two-week rolling rota", () => {
  it("averages Thursday-only week 1 and Thursday+Friday week 2 to 1.5 days and 6 hours", () => {
    const h = calculateHoliday(on(["Thursday"]), "year-round", "52", on(["Thursday", "Friday"]));
    expect(h.workingDaysPerWeek).toBe(1.5);
    expect(h.weeklyHours).toBe(6);
    expect(h.totalDaysEntitlement).toBe(8.4);
  });
  it("alternates weeks from the start Monday", () => {
    expect(rotaWeekFor("2026-11-05", "2026-11-02")).toBe(1);
    expect(rotaWeekFor("2026-11-12", "2026-11-02")).toBe(2);
    expect(rotaWeekFor("2026-11-19", "2026-11-02")).toBe(1);
  });
  it("old agreements stay single-week", () => {
    expect(normalizeAgreement({}).rotaWeeks).toBe(1);
  });
});
