import { describe, expect, it } from "vitest";
import { dayTotals, napMinutes, type CareEventRow } from "./care-events.types";

const row = (o: Partial<CareEventRow>): CareEventRow => ({
  id: "x", kind: "nap", childId: null, childName: null,
  startedAt: "2026-11-09T10:00:00Z", endedAt: null, amountMl: null, detail: null, addedBy: "nanny", ...o,
});
const day = (iso: string) => iso.slice(0, 10);

describe("care events", () => {
  it("counts finished naps only", () => {
    expect(napMinutes(row({ endedAt: "2026-11-09T11:15:00Z" }))).toBe(75);
    expect(napMinutes(row({}))).toBe(0);
  });
  it("totals one day", () => {
    const events = [
      row({ endedAt: "2026-11-09T11:00:00Z" }),
      row({ kind: "bottle", amountMl: 150 }),
      row({ kind: "bottle", amountMl: 120 }),
      row({ kind: "nappy" }),
      row({ kind: "potty" }),
      row({ kind: "bottle", amountMl: 999, startedAt: "2026-11-08T10:00:00Z" }),
    ];
    expect(dayTotals(events, "2026-11-09", day)).toEqual({ napMins: 60, bottleMl: 270, nappies: 2 });
  });
});
