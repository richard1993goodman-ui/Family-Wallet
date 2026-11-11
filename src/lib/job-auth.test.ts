import { describe, expect, it } from "vitest";
import { bearerMatches } from "./job-auth";

describe("bearerMatches", () => {
  it("accepts only the exact secret", () => {
    expect(bearerMatches("Bearer abc123", "abc123")).toBe(true);
    expect(bearerMatches("Bearer abc124", "abc123")).toBe(false);
    expect(bearerMatches("Bearer abc123 extra", "abc123")).toBe(false);
  });
  it("refuses when no secret is configured or no header is sent", () => {
    expect(bearerMatches("Bearer anything", undefined)).toBe(false);
    expect(bearerMatches("Bearer anything", "")).toBe(false);
    expect(bearerMatches(null, "abc123")).toBe(false);
    expect(bearerMatches("abc123", "abc123")).toBe(false);
  });
});
