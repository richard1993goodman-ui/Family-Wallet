import { describe, expect, it } from "vitest";

import { isBabysitting, shiftAmount, shiftHours, shiftTotals, type ShiftInput } from "./work-tools.model";

const shift = (overrides: Partial<ShiftInput> = {}): ShiftInput => ({
  shiftDate: "2026-10-29",
  startTime: "15:00",
  endTime: "19:00",
  breakMinutes: 0,
  isOvernight: false,
  hourlyRate: 15,
  ...overrides,
});

describe("babysitting vs nanny shifts", () => {
  it("treats a missing shift type as a nanny shift", () => {
    expect(isBabysitting(shift())).toBe(false);
    expect(isBabysitting(shift({ shiftType: "nanny" }))).toBe(false);
  });

  it("flags babysitting shifts", () => {
    expect(isBabysitting(shift({ shiftType: "babysitting" }))).toBe(true);
  });

  it("keeps babysitting totals separate from nanny totals", () => {
    const nanny = shift({ startTime: "15:00", endTime: "19:00", hourlyRate: 15 });
    const sit = shift({ shiftType: "babysitting", startTime: "18:30", endTime: "23:00", hourlyRate: 12 });
    const nannyTotals = shiftTotals([nanny, sit].filter((s) => !isBabysitting(s)));
    const sitTotals = shiftTotals([nanny, sit].filter(isBabysitting));
    expect(nannyTotals.hours).toBe(4);
    expect(nannyTotals.amount).toBe(60);
    expect(sitTotals.hours).toBe(4.5);
    expect(sitTotals.amount).toBe(54);
  });

  it("counts overnight babysitting across midnight", () => {
    const sit = shift({ shiftType: "babysitting", startTime: "22:00", endTime: "02:00", hourlyRate: 10 });
    expect(shiftHours(sit)).toBe(4);
    expect(shiftAmount(sit)).toBe(40);
  });
});
