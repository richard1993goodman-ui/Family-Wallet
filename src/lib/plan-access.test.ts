import { describe, expect, it } from "vitest";
import { planIncludes } from "./plan-access";

describe("plan feature gates", () => {
  it("Family plan does not include the agreement builder", () => expect(planIncludes("family", "agreement")).toBe(false));
  it("Family plan does not include the house manual and codes", () => expect(planIncludes("family", "house_manual")).toBe(false));
  it("Household plan includes the agreement builder and codes", () => {
    expect(planIncludes("household", "agreement")).toBe(true);
    expect(planIncludes("household", "house_manual")).toBe(true);
  });
  it("agency and demo wallets (no self-serve plan) keep every tool", () => expect(planIncludes(null, "agreement")).toBe(true));
});
