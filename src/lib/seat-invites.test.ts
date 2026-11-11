import { describe, expect, it } from "vitest";
import { buildSeats, hashInviteToken, isValidEmail, newInviteToken, normaliseEmail, seatCount, type InviteRow } from "./seat-invites";

const row = (o: Partial<InviteRow>): InviteRow => ({ id: "i", slot: 1, email: "a@b.co", status: "pending", invited_at: "2026-01-01T00:00:00Z", expires_at: "2099-01-01T00:00:00Z", ...o });

describe("seat board", () => {
  it("shows exactly the purchased slots, all available when empty", () => {
    const seats = buildSeats(10, []);
    expect(seats).toHaveLength(10);
    expect(seats.every((s) => s.state === "available")).toBe(true);
  });

  it("marks invited and occupied slots", () => {
    const seats = buildSeats(3, [row({ slot: 1, status: "accepted" }), row({ id: "j", slot: 2, email: "c@d.co" })]);
    expect(seats.map((s) => s.state)).toEqual(["occupied", "invited", "available"]);
  });

  it("frees a slot when its invite has expired", () => {
    const seats = buildSeats(2, [row({ expires_at: "2000-01-01T00:00:00Z" })]);
    expect(seats[0]!.state).toBe("available");
  });

  it("never hides an existing household above a reduced allowance", () => {
    expect(seatCount(2, [row({ slot: 5, status: "accepted" })])).toBe(5);
  });

  it("gives open-ended agencies a few spare slots", () => {
    expect(seatCount(null, [row({ slot: 4, status: "accepted" })])).toBe(9);
  });
});

describe("invite tokens", () => {
  it("are random, and only their hash is comparable", () => {
    const a = newInviteToken();
    expect(a).not.toBe(newInviteToken());
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashInviteToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(a)).not.toContain(a);
  });
});

describe("email checks", () => {
  it("normalises and validates", () => {
    expect(normaliseEmail("  Jo@Example.COM ")).toBe("jo@example.com");
    expect(isValidEmail("jo@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});
