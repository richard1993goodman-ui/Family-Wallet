import { describe, expect, it } from "vitest";
import { hashBackupCode, inviteHours, newBackupCode, normaliseBackupCode } from "./seat-invites";

describe("invite expiry", () => {
  it("defaults to 48 hours", () => expect(inviteHours(undefined)).toBe(48));
  it("can be set, within limits", () => {
    expect(inviteHours("72")).toBe(72);
    expect(inviteHours("0")).toBe(48);
    expect(inviteHours("9999")).toBe(48);
    expect(inviteHours("abc")).toBe(48);
  });
});

describe("backup codes", () => {
  it("are 8 unambiguous characters and different each time", () => {
    const codes = new Set(Array.from({ length: 50 }, newBackupCode));
    expect(codes.size).toBe(50);
    for (const c of codes) expect(c).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
  });
  it("hash the same however they are typed", () => {
    expect(hashBackupCode(" ab-cd 2345 ")).toBe(hashBackupCode("ABCD2345"));
    expect(normaliseBackupCode("ab-cd 2345")).toBe("ABCD2345");
  });
});
