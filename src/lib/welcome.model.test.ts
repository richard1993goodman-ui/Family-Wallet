import { describe, expect, it } from "vitest";
import { canConfirmFirst48, first48Done, validateFirst48Input } from "./welcome.types";

describe("first 48 hours shared confirmations", () => {
  it("requires both parent and nanny confirmations", () => {
    expect(first48Done("2026-10-27", null)).toBe(false);
    expect(first48Done(null, "2026-10-27")).toBe(false);
    expect(first48Done("2026-10-27", "2026-10-28")).toBe(true);
  });
  it("allows a nanny to confirm only their own checklist", () => {
    expect(canConfirmFirst48("nanny", "nanny-a", "nanny-b")).toBe(false);
    expect(canConfirmFirst48("nanny", null, "nanny-a")).toBe(false);
    expect(canConfirmFirst48("nanny", "nanny-a", "nanny-a")).toBe(true);
    expect(canConfirmFirst48("family", null, "nanny-b")).toBe(true);
  });
  it("rejects unknown checklist steps", () => {
    expect(() => validateFirst48Input({ slug: "test", nannyId: "a", stepId: "unknown" as "safety", confirmed: true, note: "" })).toThrow("Unknown");
  });
});