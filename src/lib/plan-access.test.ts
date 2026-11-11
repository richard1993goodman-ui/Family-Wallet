import { describe, expect, it } from "vitest";
import { HOUSEHOLD_FEATURES, planIncludes } from "./plan-access";

describe("plan feature access", () => {
  it("every plan includes every tool: only the number of staff differs", () => {
    for (const plan of ["family", "household", null]) {
      for (const feature of HOUSEHOLD_FEATURES) expect(planIncludes(plan, feature)).toBe(true);
    }
  });
});
