import { describe, expect, it } from "vitest";
import { resolveAgreementMode } from "./agreement-mode";

const mode = (policy: unknown, useAgreement: boolean | null, agencyEnabled: boolean | null) =>
  resolveAgreementMode({ policy, useAgreement, agencyEnabled });

describe("resolveAgreementMode", () => {
  it("lets the parents choose when nobody has set it", () => {
    expect(mode("family", true, true)).toEqual({ enabled: true, lockedByAgency: false });
    expect(mode("family", false, true)).toEqual({ enabled: false, lockedByAgency: false });
    expect(mode(undefined, null, null)).toEqual({ enabled: true, lockedByAgency: false });
  });

  it("the agency-wide default off switches it off and locks it for families left to decide", () => {
    expect(mode("family", true, false)).toEqual({ enabled: false, lockedByAgency: true });
  });

  it("an agency's choice for a family beats the parents' choice and the agency-wide default", () => {
    expect(mode("on", false, false)).toEqual({ enabled: true, lockedByAgency: true });
    expect(mode("off", true, true)).toEqual({ enabled: false, lockedByAgency: true });
  });

  it("treats an unknown policy as the parents' choice", () => {
    expect(mode("banana", true, true)).toEqual({ enabled: true, lockedByAgency: false });
  });
});
