import { describe, expect, it } from "vitest";
import { canSeeFamily, partnerContentAllowed } from "./staff.scope";

describe("partner agency isolation", () => {
  const partner = { kind: "partner" as const, agencyId: "agency-a", agencyName: "Agency A" };

  it("partner staff see their own agency's families", () => {
    expect(canSeeFamily(partner, "agency-a")).toBe(true);
  });
  it("partner staff cannot see another agency's families", () => {
    expect(canSeeFamily(partner, "agency-b")).toBe(false);
  });
  it("partner staff cannot see the owner's own families", () => {
    expect(canSeeFamily(partner, null)).toBe(false);
  });
  it("the owner sees only families with no partner agency", () => {
    expect(canSeeFamily({ kind: "owner" }, "agency-b")).toBe(false);
    expect(canSeeFamily({ kind: "owner" }, null)).toBe(true);
  });
});

describe("partner premium content tools", () => {
  const off = { allow_challenges: false, allow_perks: false, allow_playbooks: false, status: "active" };
  it("active partners can manage their own challenges without an owner unlock", () => {
    expect(partnerContentAllowed(off, "challenges")).toBe(true);
  });
  it("active partners can manage their own parent perks without an owner unlock", () => {
    expect(partnerContentAllowed(off, "perks")).toBe(true);
  });
  it("active partners can manage their own playbooks without an owner unlock", () => {
    expect(partnerContentAllowed(off, "playbooks")).toBe(true);
  });
  it("a paused agency loses its tools", () => {
    expect(partnerContentAllowed({ ...off, allow_challenges: true, status: "paused" }, "challenges")).toBe(false);
  });
  it("a missing agency cannot access content", () => {
    expect(partnerContentAllowed(null, "perks")).toBe(false);
  });
});
