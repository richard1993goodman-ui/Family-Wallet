import { describe, expect, it } from "vitest";

import {
  intervalsFor,
  isAgencyPlan,
  isPlan,
  PLANS,
  planFromLookupKey,
  priceLookupKey,
} from "./billing.config";

describe("plan lookup keys", () => {
  it("matches the price ids created in the payment provider", () => {
    expect(priceLookupKey("family", "month")).toBe("fw_family_month");
    expect(priceLookupKey("family", "year")).toBe("fw_family_year");
    expect(priceLookupKey("agency_partner", "month")).toBe("fw_agency_partner_month");
    expect(priceLookupKey("agency_growth", "month")).toBe("fw_agency_growth_month");
    expect(priceLookupKey("agency_scale", "month")).toBe("fw_agency_scale_month");
  });

  it("reads the plan back from a price's lookup key", () => {
    expect(planFromLookupKey("fw_family_year")).toBe("family");
    expect(planFromLookupKey("fw_agency_scale_month")).toBe("agency_scale");
  });

  it("rejects a key for a plan or period that is not sold", () => {
    expect(planFromLookupKey("fw_agency_partner_year")).toBeNull();
    expect(planFromLookupKey("fw_family_monthly")).toBeNull();
    expect(planFromLookupKey(undefined)).toBeNull();
  });
});

describe("agency plans", () => {
  it("are billed monthly only, unlike the family plans", () => {
    expect(intervalsFor("agency_partner")).toEqual(["month"]);
    expect(intervalsFor("agency_growth")).toEqual(["month"]);
    expect(intervalsFor("agency_scale")).toEqual(["month"]);
    expect(intervalsFor("family")).toEqual(["month", "year"]);
  });

  it("carry the household allowance shown on the pricing page", () => {
    expect(PLANS.agency_partner.allowance).toBe(10);
    expect(PLANS.agency_growth.allowance).toBe(50);
    expect(PLANS.agency_scale.allowance).toBe(100);
    expect(PLANS.family.allowance).toBeUndefined();
  });

  it("are recognised as agency plans and not as household ones", () => {
    expect(isAgencyPlan("agency_growth")).toBe(true);
    expect(isAgencyPlan("family")).toBe(false);
    expect(isPlan("agency_scale")).toBe(true);
    expect(isPlan("agency_premium")).toBe(false);
  });
});
