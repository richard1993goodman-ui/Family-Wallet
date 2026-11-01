import { describe, expect, it } from "vitest";
import { canManageManual, manualSummary, manualEntrySchema } from "./house-manual.types";

describe("house manual privacy", () => {
  it("allows family management but not nanny or signed-out management", () => {
    expect(canManageManual("family")).toBe(true);
    expect(canManageManual("nanny")).toBe(false);
    expect(canManageManual(null)).toBe(false);
  });
  it("never includes the secret value in summaries", () => {
    const input = { id: "entry", category: "access", title: "Test lock", notes: "Test notes", has_secret: true, updated_at: "2026-10-29", secret_value: "fictional-test-value" };
    const summary = manualSummary(input);
    expect(summary.hasSecret).toBe(true);
    expect(summary).not.toHaveProperty("secret_value");
    expect(JSON.stringify(summary)).not.toContain("fictional-test-value");
  });
  it("preserves an existing code when editing without a replacement", () => {
    const entry = manualEntrySchema.parse({ category: "access", title: "WiFi", notes: "Network name" });
    expect(entry.secretValue).toBeUndefined();
  });
});