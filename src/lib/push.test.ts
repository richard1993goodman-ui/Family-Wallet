import { describe, expect, it, vi } from "vitest";
import { countUnseen, inQuietHours, isPushFeature } from "./push";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

describe("inQuietHours", () => {
  const at = (iso: string) => new Date(iso);
  it("handles a window that wraps midnight", () => {
    expect(inQuietHours(at("2026-11-09T22:30:00Z"), "UTC", 21, 7)).toBe(true);
    expect(inQuietHours(at("2026-11-10T06:59:00Z"), "UTC", 21, 7)).toBe(true);
    expect(inQuietHours(at("2026-11-10T07:00:00Z"), "UTC", 21, 7)).toBe(false);
    expect(inQuietHours(at("2026-11-09T12:00:00Z"), "UTC", 21, 7)).toBe(false);
  });
  it("handles a same-day window and uses the device time zone", () => {
    expect(inQuietHours(at("2026-11-09T13:00:00Z"), "UTC", 12, 14)).toBe(true);
    // 21:00 UTC is 06:00 in Tokyo (quiet), but 02:00 UTC is 11:00 there (not quiet).
    expect(inQuietHours(at("2026-11-09T21:00:00Z"), "Asia/Tokyo", 21, 7)).toBe(true);
    expect(inQuietHours(at("2026-11-10T02:00:00Z"), "Asia/Tokyo", 21, 7)).toBe(false);
  });
  it("is off when either end is missing or both are equal", () => {
    expect(inQuietHours(new Date(), "UTC", null, 7)).toBe(false);
    expect(inQuietHours(new Date(), "UTC", 8, 8)).toBe(false);
  });
});

describe("push features", () => {
  it("alerts for messages, photos and daily updates", () => {
    for (const key of ["messages", "moments", "log", "planner"]) expect(isPushFeature(key)).toBe(true);
  });
  it("keeps the chatty Today log to a badge", () => {
    expect(isPushFeature("today")).toBe(false);
  });
});

describe("countUnseen", () => {
  const activity = [
    { feature: "messages", actor: "nanny", created_at: "2026-11-09T10:00:00Z" },
    { feature: "messages", actor: "nanny", created_at: "2026-11-09T12:00:00Z" },
    { feature: "incidents", actor: "nanny", created_at: "2026-11-09T09:00:00Z" },
    { feature: "log", actor: "family", created_at: "2026-11-09T11:00:00Z" },
  ];
  it("counts only the other person's changes made after you last looked", () => {
    expect(countUnseen("family", activity, [{ feature: "messages", seen_at: "2026-11-09T11:00:00Z" }])).toEqual({
      messages: 1,
      incidents: 1,
    });
  });
  it("never counts your own changes", () => {
    expect(countUnseen("nanny", activity, [])["log"]).toBe(1);
    expect(countUnseen("family", activity, [])["log"]).toBeUndefined();
  });
});
