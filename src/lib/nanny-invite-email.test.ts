import { describe, expect, it } from "vitest";
import { buildNannyInviteEmail } from "./nanny-invite-email";

const base = { nannyName: "Jess", familyName: "Harrington Family", agencyName: "Nurture", url: "https://familywallet.io/nanny/harrington-ab12", code: "K7M2PQ" };

describe("nanny invite email", () => {
  it("carries the nanny's own link and access code, in text and html", () => {
    const m = buildNannyInviteEmail(base);
    expect(m.text).toContain(base.url);
    expect(m.text).toContain("K7M2PQ");
    expect(m.html).toContain("K7M2PQ");
    expect(m.subject).toContain("Harrington Family");
  });
  it("escapes names so they cannot inject markup", () => {
    const m = buildNannyInviteEmail({ ...base, nannyName: "<b>x</b>" });
    expect(m.html).not.toContain("<b>x</b>");
  });
});
