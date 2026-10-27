import { describe, expect, it } from "vitest";
import { calculateNannyCost, grossFromNet, netFromGross } from "./nanny-cost.model";

const base = { rate: 15, basis: "gross" as const, hoursPerDay: 3.5, daysPerWeek: 1, pattern: "year-round" as const, termWeeks: 38, includeMembership: true, payrollMonthly: 0 };

describe("nanny cost", () => {
  it("1 day a week is Bronze at £50 + VAT", () => {
    const r = calculateNannyCost(base);
    expect(r.tier.name).toBe("Bronze");
    expect(r.membership).toBeCloseTo(720);
  });
  it("3 days a week is Silver at £80 + VAT", () => {
    expect(calculateNannyCost({ ...base, daysPerWeek: 3 }).membership).toBeCloseTo(1152);
  });
  it("net-to-gross round-trips", () => {
    expect(netFromGross(grossFromNet(30000))).toBeCloseTo(30000, 0);
  });
  it("term-time adds 12.07% rolled-up holiday", () => {
    const r = calculateNannyCost({ ...base, pattern: "term-time", termWeeks: 38 });
    expect(r.grossPay).toBeCloseTo(15 * 3.5 * 38 * 1.1207);
  });
});
