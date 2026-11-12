import { describe, expect, it } from "vitest";
import { entitlementOpen, parseIapEvent, stateFor, walletStatusFor, willRenewFor } from "./iap";
import { isStale, verifyRevenueCatAuth } from "./iap.server";

const PERSON = "6f9619ff-8b86-4011-b42d-00c04fc964ff";
const base = (over: Record<string, unknown> = {}) => ({
  event: {
    id: "evt-1",
    type: "INITIAL_PURCHASE",
    app_user_id: PERSON,
    product_id: "fw_family_month",
    original_transaction_id: "1000000123",
    environment: "SANDBOX",
    period_type: "NORMAL",
    expiration_at_ms: Date.parse("2026-12-12T00:00:00Z"),
    ...over,
  },
});

describe("reading a store event", () => {
  it("reads a purchase", () => {
    expect(parseIapEvent(base())).toEqual({
      eventId: "evt-1",
      type: "INITIAL_PURCHASE",
      personId: PERSON,
      product: "fw_family_month",
      externalRef: "1000000123",
      environment: "sandbox",
      periodEnd: "2026-12-12T00:00:00.000Z",
      trial: false,
    });
  });

  it("ignores events with no usable id, or for a user we do not know", () => {
    for (const bad of [
      null,
      {},
      { event: null },
      base({ id: undefined }),
      base({ app_user_id: "$RCAnonymousID:abc" }),
      base({ app_user_id: "not-a-uuid" }),
    ])
      expect(parseIapEvent(bad)).toBeNull();
  });

  it("treats production as the default and sees trials", () => {
    expect(parseIapEvent(base({ environment: "PRODUCTION", period_type: "TRIAL" }))).toMatchObject({
      environment: "production",
      trial: true,
    });
  });
});

describe("what an event means", () => {
  it("keeps access through a purchase, a renewal and a cancellation (paid until the period ends)", () => {
    for (const type of [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "CANCELLATION",
      "UNCANCELLATION",
      "PRODUCT_CHANGE",
    ])
      expect(stateFor({ type, trial: false })).toBe("active");
    expect(stateFor({ type: "INITIAL_PURCHASE", trial: true })).toBe("trial");
  });

  it("holds access while Apple retries a payment, and ends it on expiry", () => {
    expect(stateFor({ type: "BILLING_ISSUE", trial: false })).toBe("grace");
    expect(stateFor({ type: "EXPIRATION", trial: false })).toBe("expired");
  });

  it("changes nothing for events we do not track", () => {
    expect(stateFor({ type: "TEST", trial: false })).toBeNull();
    expect(stateFor({ type: "TRANSFER", trial: false })).toBeNull();
  });

  it("opens the wallet only while the entitlement is live and in date", () => {
    const now = Date.parse("2026-11-12T00:00:00Z");
    expect(entitlementOpen("active", "2026-12-01T00:00:00Z", now)).toBe(true);
    expect(entitlementOpen("trial", null, now)).toBe(true);
    expect(entitlementOpen("grace", "2026-12-01T00:00:00Z", now)).toBe(true);
    expect(entitlementOpen("active", "2026-11-01T00:00:00Z", now)).toBe(false);
    expect(entitlementOpen("expired", "2026-12-01T00:00:00Z", now)).toBe(false);
    expect(walletStatusFor(true)).toBe("active");
    expect(walletStatusFor(false)).toBe("cancelled");
  });

  it("records whether it will renew", () => {
    expect(willRenewFor("RENEWAL")).toBe(true);
    expect(willRenewFor("CANCELLATION")).toBe(false);
    expect(willRenewFor("EXPIRATION")).toBe(false);
    expect(willRenewFor("BILLING_ISSUE")).toBeNull();
  });
});

describe("a late or repeated delivery", () => {
  it("never moves the state backwards", () => {
    expect(isStale("2026-12-12T00:00:00Z", "2026-11-12T00:00:00Z")).toBe(true);
    expect(isStale("2026-12-12T00:00:00Z", "2026-12-12T00:00:00Z")).toBe(false);
    expect(isStale(null, "2026-11-12T00:00:00Z")).toBe(false);
    expect(isStale("2026-12-12T00:00:00Z", null)).toBe(false);
  });
});

describe("the webhook secret", () => {
  it("refuses anything but the exact secret, and everything when no secret is set", () => {
    const before = process.env["REVENUECAT_WEBHOOK_SECRET"];
    process.env["REVENUECAT_WEBHOOK_SECRET"] = "s3cret-value";
    expect(verifyRevenueCatAuth("Bearer s3cret-value")).toBe(true);
    for (const bad of [null, "", "Bearer wrong", "s3cret-value", "Bearer s3cret-value extra"])
      expect(verifyRevenueCatAuth(bad)).toBe(false);
    delete process.env["REVENUECAT_WEBHOOK_SECRET"];
    expect(verifyRevenueCatAuth("Bearer s3cret-value")).toBe(false);
    if (before !== undefined) process.env["REVENUECAT_WEBHOOK_SECRET"] = before;
  });
});
