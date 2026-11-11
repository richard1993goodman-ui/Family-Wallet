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
  it("puts no practical cap on the Family plan", () => {
    expect(staffLimitFor("family")).toEqual({ limit: 100, planName: "Family", upgradeable: false });
  });
  it("uses the agency ceiling when there is no subscription", () => {
    expect(staffLimitFor(null)).toEqual({ limit: 6, planName: null, upgradeable: false });
  });
});

import { navFor } from "../components/wallet-nav";
import { staffNoun } from "./staff-roles";

describe("staff wording", () => {
  it("calls staff by the role they share, or 'staff' when mixed", () => {
    expect(staffNoun([])).toBe("nanny");
    expect(staffNoun(["au_pair"])).toBe("au pair");
    expect(staffNoun(["nanny", "nanny"])).toBe("nanny");
    expect(staffNoun(["nanny", "housekeeper"])).toBe("staff");
    expect(staffNoun(["other"])).toBe("staff");
  });

  it("the family menu section is Household staff and its labels follow who they employ", () => {
    const section = navFor("family", true, "au pair").find((s) => s.label === "Household staff");
    expect(section).toBeTruthy();
    const labels = section!.items.map((i) => i.label);
    expect(labels).toContain("Au pair agreement");
    expect(labels).toContain("Au pair training");
    expect(labels).not.toContain("Nanny agreement");
  });
});
