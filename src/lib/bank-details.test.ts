import { describe, expect, it } from "vitest";
import { canEditBankDetails, canViewBankDetails, maskAccount } from "./bank-details.types";

describe("nanny bank details permissions", () => {
  it("parents cannot edit a nanny's bank details", () => expect(canEditBankDetails("family", null, "n1")).toBe(false));
  it("a nanny cannot edit another nanny's details", () => expect(canEditBankDetails("nanny", "n2", "n1")).toBe(false));
  it("a nanny can edit their own", () => expect(canEditBankDetails("nanny", "n1", "n1")).toBe(true));
  it("parents can view all nannies' details", () => expect(canViewBankDetails("family", null, "n1")).toBe(true));
  it("a nanny cannot view another nanny's details", () => expect(canViewBankDetails("nanny", "n2", "n1")).toBe(false));
  it("lists only show the last four digits", () => expect(maskAccount("12345678", null)).toBe("•••• 5678"));
});
