import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_HOST, DEEP_LINK_PREFIXES, deepLinkPath } from "./deep-links";

describe("deepLinkPath", () => {
  it("opens our own invitation, claim and wallet links, keeping the query", () => {
    expect(deepLinkPath("https://familywallet.io/join/abc123")).toBe("/join/abc123");
    expect(deepLinkPath("https://familywallet.io/claim/tok")).toBe("/claim/tok");
    expect(deepLinkPath("https://familywallet.io/w/harrington-ab12?pin=123456")).toBe(
      "/w/harrington-ab12?pin=123456",
    );
    expect(deepLinkPath("https://familywallet.io/nanny/x")).toBe("/nanny/x");
    expect(deepLinkPath("https://familywallet.io/join")).toBe("/join");
  });

  it("refuses other sites, look-alike hosts and tricks in the address", () => {
    for (const bad of [
      "https://evil.example/join/abc",
      "https://familywallet.io.evil.example/join/abc",
      "https://www.familywallet.io/join/abc",
      "https://familywallet.io@evil.example/join/abc",
      "https://user:pass@familywallet.io/join/abc",
      "https://familywallet.io:8443/join/abc",
      "http://familywallet.io/join/abc",
      "javascript:alert(1)",
      "familywallet://join/abc",
    ])
      expect(deepLinkPath(bad)).toBeNull();
  });

  it("refuses pages the app should never be steered to from outside", () => {
    for (const path of ["/admin", "/auth", "/api/stripe/webhook", "/pricing", "/"])
      expect(deepLinkPath(`https://familywallet.io${path}`)).toBeNull();
  });

  it("refuses empty or broken input", () => {
    expect(deepLinkPath(null)).toBeNull();
    expect(deepLinkPath("")).toBeNull();
    expect(deepLinkPath("not a url")).toBeNull();
  });
});

describe("deep link readiness", () => {
  it("only lists pages that exist in the app", () => {
    const files = readFileSync("src/routeTree.gen.ts", "utf8");
    for (const prefix of DEEP_LINK_PREFIXES) expect(files).toContain(`'/${prefix}`);
  });

  it("has valid templates for the iOS and Android link files, with the app's own id and paths", () => {
    const ios = JSON.parse(
      readFileSync("mobile/deep-links/apple-app-site-association.template.json", "utf8"),
    );
    const android = JSON.parse(readFileSync("mobile/deep-links/assetlinks.template.json", "utf8"));
    expect(JSON.stringify(ios)).toContain("io.familywallet.app");
    expect(android[0].target.package_name).toBe("io.familywallet.app");
    const components = ios.applinks.details[0].components.map((c: { "/": string }) => c["/"]);
    for (const prefix of DEEP_LINK_PREFIXES)
      expect(components.some((c: string) => c === `/${prefix}/*` || c === `/${prefix}`)).toBe(true);
  });

  it("agrees with the Capacitor shell about the app id and host", () => {
    const config = readFileSync("capacitor.config.ts", "utf8");
    expect(config).toContain("io.familywallet.app");
    expect(config).toContain(`https://${APP_HOST}`);
  });

  it("serves the Apple link file with the real Team ID and no placeholder; Android's waits for its fingerprint", () => {
    expect(existsSync("mobile/deep-links/README.md")).toBe(true);
    const apple = readFileSync("public/.well-known/apple-app-site-association", "utf8");
    expect(apple).toContain("T3KFJ4JY67.io.familywallet.app");
    expect(apple).not.toContain("REPLACE_");
    expect(existsSync("public/.well-known/assetlinks.json")).toBe(false);
  });
});
