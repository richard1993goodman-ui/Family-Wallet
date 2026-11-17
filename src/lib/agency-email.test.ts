import { describe, expect, it } from "vitest";
import { buildAgencyWelcomeEmail } from "./agency-email";

const base = { agencyName: "Acme", plan: "Partner", allowance: 10, contactEmail: "a@acme.com" };

describe("agency welcome email", () => {
  it("includes the setup link when one is provided", () => {
    const m = buildAgencyWelcomeEmail({ ...base, setupLink: "https://x.test/setup?t=1" });
    expect(m.text).toContain("https://x.test/setup?t=1");
    expect(m.html).toContain('href="https://x.test/setup?t=1"');
  });
  it("falls back to the promise of a setup email without a link", () => {
    const m = buildAgencyWelcomeEmail({ ...base, setupLink: null });
    expect(m.text).toContain("We email you a setup link");
  });
});
