import { describe, expect, it } from "vitest";
import { accessFromMembership, chooseAccess } from "./access";

const owner = { status: "active", role: "owner", nannyId: null } as const;
const staff = { status: "active", role: "staff", nannyId: "n1" } as const;

describe("accessFromMembership", () => {
  it("gives an active owner family access", () => {
    expect(accessFromMembership(owner)).toEqual({ level: "family", nannyId: null });
  });
  it("gives active staff access as that staff member", () => {
    expect(accessFromMembership(staff)).toEqual({ level: "nanny", nannyId: "n1" });
  });
  it.each(["invited", "revoked", "ended"] as const)("gives nothing for a %s membership", (status) => {
    expect(accessFromMembership({ ...staff, status })).toBeNull();
  });
  it("gives nothing without a membership", () => {
    expect(accessFromMembership(null)).toBeNull();
  });
});

describe("chooseAccess", () => {
  const account = { level: "family", nannyId: null } as const;
  const code = { level: "nanny", nannyId: "n1" } as const;

  it("prefers an account login over a code session", () => {
    expect(chooseAccess(account, code)).toEqual(account);
  });
  it("falls back to the code session when there is no account login", () => {
    expect(chooseAccess(null, code)).toEqual(code);
  });
  it("refuses an old code session once the membership is revoked or ended", () => {
    expect(chooseAccess(null, code, true)).toBeNull();
  });
  it("gives nothing when neither login applies", () => {
    expect(chooseAccess(null, null)).toBeNull();
  });
});
