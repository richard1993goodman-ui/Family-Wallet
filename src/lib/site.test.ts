import { describe, expect, it } from "vitest";
import { PUBLIC_SITE_URL, siteUrl } from "./site";

describe("public site links", () => {
  it("always points at the new familywallet.io domain", () => {
    expect(PUBLIC_SITE_URL).toBe("https://familywallet.io");
  });

  it("never uses the old athletemannies domain", () => {
    expect(PUBLIC_SITE_URL).not.toMatch(/athletemannies/i);
    expect(siteUrl("/p/nurture-family-agency/demo")).not.toMatch(/athletemannies/i);
  });

  it("builds absolute links for wallet, partner page and nanny invite paths", () => {
    expect(siteUrl("/w/abc123")).toBe("https://familywallet.io/w/abc123");
    expect(siteUrl("p/nurture/demo")).toBe("https://familywallet.io/p/nurture/demo");
    expect(siteUrl("/nanny/abc123")).toBe("https://familywallet.io/nanny/abc123");
  });
});
