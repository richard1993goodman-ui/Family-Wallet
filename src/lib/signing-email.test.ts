import { describe, expect, it } from "vitest";
import { buildSignedCopyEmail, buildSigningCodeEmail } from "./signing-email";

describe("signing code email", () => {
  const mail = buildSigningCodeEmail({ code: "493017", familyName: "Harrington", minutes: 10 });
  it("shows the code and when it expires, and nothing to click", () => {
    expect(mail.subject).toContain("493017");
    expect(mail.text).toContain("493017");
    expect(mail.text).toContain("10 minutes");
    expect(mail.html).not.toContain("<a ");
    expect(mail.text).not.toContain("http");
  });
  it("escapes the family name", () => {
    expect(buildSigningCodeEmail({ code: "1", familyName: "<b>x</b>", minutes: 10 }).html).not.toContain("<b>x</b>");
  });
});

describe("signed copy notice", () => {
  const mail = buildSignedCopyEmail({ name: "Jess", familyName: "Harrington", version: 2 });
  it("says a copy is saved, without carrying wording, a link or a code", () => {
    expect(mail.text).toContain("version 2");
    expect(mail.text).toContain("Documents");
    expect(mail.text).not.toContain("http");
    expect(mail.text.toLowerCase()).not.toContain("access code");
  });
});
