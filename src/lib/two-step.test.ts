import { describe, expect, it } from "vitest";
import { assertTwoStep } from "./staff.scope";

describe("agency two-step rule", () => {
  it("rejects a password-only agency session", () => {
    expect(() => assertTwoStep({ claims: { aal: "aal1" } })).toThrow(/Two-step/);
  });
  it("allows a session verified with an authenticator code", () => {
    expect(() => assertTwoStep({ claims: { aal: "aal2" } })).not.toThrow();
  });
});
