import { describe, expect, it } from "vitest";
import { defaultWorkingDays } from "./agreement.model";
import { buildMonth, shiftMonth, type MonthEntry, type MonthShift } from "./month-overview";

const schedules = [
  {
    nannyId: "n1",
    nannyName: "Jess",
    workingDays: defaultWorkingDays.map((d) => ({
      ...d,
      enabled: d.day === "Monday",
      startTime: "08:00",
      endTime: "18:00",
    })),
  },
];
const entry = (over: Partial<MonthEntry>): MonthEntry => ({
  id: "e",
  entry_date: "2026-11-09",
  time_label: null,
  end_time_label: null,
  title: "Note",
  child_name: null,
  entry_type: "note",
  status: "active",
  added_by: "family",
  notes: null,
  ...over,
});
const shift = (over: Partial<MonthShift>): MonthShift => ({
  id: "s",
  shift_date: "2026-11-09",
  start_time: "08:00",
  end_time: "18:00",
  break_minutes: 30,
  is_overnight: false,
  status: "approved",
  shift_type: "nanny",
  notes: null,
  ...over,
});

describe("buildMonth", () => {
  it("pads November 2026 to whole Monday-first weeks", () => {
    const { days } = buildMonth("2026-11", { entries: [], logs: [], shifts: [] }, schedules);
    expect(days[0]!.iso).toBe("2026-10-26");
    expect(days.at(-1)!.iso).toBe("2026-12-06");
    expect(days.length % 7).toBe(0);
  });
  it("totals agreed and logged hours, skipping cancelled days and declined shifts", () => {
    const { days, totals } = buildMonth(
      "2026-11",
      {
        entries: [
          entry({ id: "a" }),
          entry({ id: "b", added_by: "nanny" }),
          entry({
            id: "c",
            entry_date: "2026-11-16",
            entry_type: "shift_change",
            status: "cancelled",
          }),
        ],
        logs: [],
        shifts: [shift({}), shift({ id: "d", status: "declined" })],
      },
      schedules,
    );
    // Five Mondays in November 2026, one cancelled.
    expect(totals.agreedHours).toBe(40);
    expect(totals.loggedHours).toBe(9.5);
    const day = days.find((d) => d.iso === "2026-11-09")!;
    expect(day.parentNotes.map((e) => e.id)).toEqual(["a"]);
    expect(day.nannyPlans.map((e) => e.id)).toEqual(["b"]);
    expect(days.find((d) => d.iso === "2026-11-16")!.cancelled).toBe(true);
  });
  it("steps across a year boundary", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});
