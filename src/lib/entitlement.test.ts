import { describe, expect, it } from "vitest";
import { graceDays, transitionEnd, transitionExpired, walletOpen } from "./entitlement";

const now = Date.parse("2026-06-10T12:00:00Z");
const future = "2026-06-12T00:00:00Z";
const past = "2026-06-01T00:00:00Z";

describe("grace period", () => {
  it("defaults to seven days and can be configured", () => {
    expect(graceDays(undefined)).toBe(7);
    expect(graceDays("14")).toBe(14);
    expect(graceDays("nonsense")).toBe(7);
    expect(graceDays("-3")).toBe(7);
  });
  it("ends that many days from now", () => {
    expect(transitionEnd(new Date(now), 7).toISOString()).toBe("2026-06-17T12:00:00.000Z");
  });
});

describe("who can open a wallet", () => {
  it("keeps access during the transition and cuts it after", () => {
    expect(walletOpen("active", "transition", future, now)).toBe(true);
    expect(walletOpen("active", "transition", past, now)).toBe(false);
  });
  it("never blocks unmanaged, agency-funded or direct families", () => {
    expect(walletOpen("active", null, null, now)).toBe(true);
    expect(walletOpen("active", "agency_active", null, now)).toBe(true);
    expect(walletOpen("active", "direct_active", past, now)).toBe(true);
    expect(transitionExpired(null, past, now)).toBe(false);
  });
  it("blocks suspended and cancelled wallets", () => {
    expect(walletOpen("suspended", "suspended", null, now)).toBe(false);
    expect(walletOpen("cancelled", null, null, now)).toBe(false);
  });
});
