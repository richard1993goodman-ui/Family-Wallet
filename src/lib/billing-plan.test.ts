import { describe, expect, it } from "vitest";
import { planFromLookupKey, priceLookupKey } from "./billing.config";

describe("planFromLookupKey", () => {
  it("reads the plan back from every price key we create", () => {
    for (const plan of ["family", "household"] as const)
      for (const interval of ["month", "year"] as const)
        expect(planFromLookupKey(priceLookupKey(plan, interval))).toBe(plan);
  });
  it("ignores keys that are not ours", () => {
    expect(planFromLookupKey(null)).toBeNull();
    expect(planFromLookupKey("other_household_month")).toBeNull();
    expect(planFromLookupKey("fw_gold_month")).toBeNull();
  });
});
