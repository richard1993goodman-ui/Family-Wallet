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
  it("partner staff cannot see Athlete Mannies' own families", () => {
    expect(canSeeFamily(partner, null)).toBe(false);
  });
  it("the owner sees every family", () => {
    expect(canSeeFamily({ kind: "owner" }, "agency-b")).toBe(true);
    expect(canSeeFamily({ kind: "owner" }, null)).toBe(true);
  });
});

describe("partner premium content tools", () => {
  const off = { allow_challenges: false, allow_perks: false, allow_playbooks: false, status: "active" };
  it("a tool stays locked until the owner switches it on", () => {
    expect(partnerContentAllowed(off, "challenges")).toBe(false);
  });
  it("switching on one tool does not unlock the others", () => {
    const on = { ...off, allow_perks: true };
    expect(partnerContentAllowed(on, "perks")).toBe(true);
    expect(partnerContentAllowed(on, "playbooks")).toBe(false);
  });
  it("a paused agency loses its tools", () => {
    expect(partnerContentAllowed({ ...off, allow_challenges: true, status: "paused" }, "challenges")).toBe(false);
  });
});
