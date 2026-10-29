import { describe, expect, it } from "vitest";
import { canEditPlaybook } from "./kids-playbook.types";

describe("kids playbook permissions", () => {
  it("lets parents edit every section", () => {
    for (const c of ["comfort", "handle", "friends", "activities"]) expect(canEditPlaybook("family", c)).toBe(true);
  });
  it("lets nannies add rainy-day ideas only", () => {
    expect(canEditPlaybook("nanny", "activities")).toBe(true);
    expect(canEditPlaybook("nanny", "friends")).toBe(false);
    expect(canEditPlaybook("nanny", "handle")).toBe(false);
  });
  it("blocks signed-out users", () => {
    expect(canEditPlaybook(null, "activities")).toBe(false);
  });
});
