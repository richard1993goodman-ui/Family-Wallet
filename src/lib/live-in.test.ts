import { describe, expect, it } from "vitest";
import { DEFAULT_LIVE_IN, mondayOf, weekWarnings } from "./live-in.types";
import { planIncludes } from "./plan-access";

const s = { ...DEFAULT_LIVE_IN, maxWeeklyHours: 30, daysOffPerWeek: 2 };

describe("live-in tools", () => {
  it("flags a week over the agreed hours cap", () => expect(weekWarnings({ hoursWorked: 32, daysOff: 2 }, s)).toEqual(["2h over the 30h cap"]));
  it("flags fewer days off than agreed", () => expect(weekWarnings({ hoursWorked: 25, daysOff: 1 }, s)).toEqual(["only 1 of 2 days off"]));
  it("a week within the cap has no warnings", () => expect(weekWarnings({ hoursWorked: 30, daysOff: 2 }, s)).toEqual([]));
  it("weeks start on Monday", () => expect(mondayOf("2026-11-12")).toBe("2026-11-09"));
  it("are part of the Household plan, not Family", () => {
    expect(planIncludes("family", "live_in")).toBe(false);
    expect(planIncludes("household", "live_in")).toBe(true);
  });
});
