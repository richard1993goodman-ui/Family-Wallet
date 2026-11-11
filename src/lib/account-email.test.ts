import { describe, expect, it } from "vitest";
import { buildClaimEmail } from "./account-email";

describe("claim email", () => {
  const mail = buildClaimEmail({ name: "Jess", familyName: "Harrington", url: "https://familywallet.io/claim/abc", minutes: 30 });

  it("carries the one-time link and its expiry", () => {
    expect(mail.text).toContain("https://familywallet.io/claim/abc");
    expect(mail.text).toContain("30 minutes");
    expect(mail.html).toContain('href="https://familywallet.io/claim/abc"');
  });
  it("never includes an access code", () => {
    expect(mail.text.toLowerCase()).not.toContain("access code");
  });
  it("escapes names so they cannot inject markup", () => {
    const evil = buildClaimEmail({ name: "<b>x</b>", familyName: "A&B", url: "https://x.y/z", minutes: 30 });
    expect(evil.html).not.toContain("<b>x</b>");
    expect(evil.html).toContain("A&amp;B");
  });
});
