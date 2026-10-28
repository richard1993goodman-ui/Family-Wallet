import { describe, expect, it } from "vitest";
import { canSeeFamily } from "./staff.scope";

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
