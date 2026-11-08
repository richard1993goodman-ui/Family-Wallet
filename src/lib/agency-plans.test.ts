import { describe, expect, it } from "vitest";

import { allowanceUsage, formatPounds, isActiveHousehold } from "./agency-plans";

const now = new Date("2026-11-08T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe("isActiveHousehold", () => {
  it("counts a household opened within 30 days", () => {
    expect(isActiveHousehold(daysAgo(0), now)).toBe(true);
    expect(isActiveHousehold(daysAgo(29), now)).toBe(true);
  });
  it("does not count one that is older, never opened, or has a bad date", () => {
    expect(isActiveHousehold(daysAgo(31), now)).toBe(false);
    expect(isActiveHousehold(null, now)).toBe(false);
    expect(isActiveHousehold("nonsense", now)).toBe(false);
  });
});

describe("allowanceUsage", () => {
  it("is ok well under the allowance", () => {
    const u = allowanceUsage("partner", null, 4);
    expect(u).toMatchObject({ allowance: 10, remaining: 6, over: 0, percent: 40, level: "ok", extraPence: 0 });
  });
  it("warns from 80% of the allowance", () => {
    expect(allowanceUsage("partner", null, 8).level).toBe("near");
    expect(allowanceUsage("partner", null, 10).level).toBe("near");
  });
  it("charges for households over the allowance", () => {
    const u = allowanceUsage("partner", null, 13);
    expect(u).toMatchObject({ over: 3, remaining: 0, percent: 100, level: "over", extraPence: 900 });
  });
  it("uses each plan's own rates", () => {
    expect(allowanceUsage("growth", null, 52).extraPence).toBe(400);
    expect(allowanceUsage("scale", null, 102).extraPence).toBe(300);
  });
  it("lets an agreed allowance override the plan default", () => {
    expect(allowanceUsage("partner", 25, 20)).toMatchObject({ allowance: 25, level: "near" });
  });
  it("has no cap on Enterprise", () => {
    expect(allowanceUsage("enterprise", null, 400)).toMatchObject({ allowance: null, level: "unlimited", extraPence: 0 });
  });
  it("treats a zero allowance as full", () => {
    expect(allowanceUsage("partner", 0, 0)).toMatchObject({ percent: 100, level: "ok" });
  });
});

describe("formatPounds", () => {
  it("drops pence when whole", () => {
    expect(formatPounds(3900)).toBe("£39");
    expect(formatPounds(150)).toBe("£1.50");
  });
});
