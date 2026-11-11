import { describe, expect, it } from "vitest";

import { isStaffRole, roleLabel, staffLimitFor } from "./staff-roles";

describe("staff roles", () => {
  it("knows its roles and labels them", () => {
    expect(isStaffRole("au_pair")).toBe(true);
    expect(isStaffRole("wizard")).toBe(false);
    expect(roleLabel("au_pair")).toBe("Au pair");
    expect(roleLabel("nonsense")).toBe("Staff");
  });
});

describe("staffLimitFor", () => {
  it("gives the Family plan one person and a path to upgrade", () => {
    expect(staffLimitFor("family")).toEqual({ limit: 2, planName: "Family", upgradeable: true });
  });
  it("gives the Household plan six", () => {
    expect(staffLimitFor("household")).toEqual({ limit: 6, planName: "Household", upgradeable: false });
  });
  it("uses the agency ceiling when there is no subscription", () => {
    expect(staffLimitFor(null)).toEqual({ limit: 6, planName: null, upgradeable: false });
  });
});
