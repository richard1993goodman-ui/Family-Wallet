import { describe, expect, it } from "vitest";
import { PARTNER_SETUP_FEE, partnerFee, tierFor } from "./partner-tiers";

describe("partner tiers", () => {
  it("1-5 families is £150", () => expect(tierFor(5).monthly).toBe(150));
  it("6-10 families is £250", () => expect(tierFor(6).monthly).toBe(250));
  it("11-15 families is £350", () => expect(tierFor(15).monthly).toBe(350));
  it("16-20 families is £400", () => expect(tierFor(20).monthly).toBe(400));
  it("21-30 families is £500", () => expect(tierFor(30).monthly).toBe(500));
  it("over 30 is bespoke", () => expect(tierFor(31).monthly).toBeNull());
  it("no setup fee", () => expect(PARTNER_SETUP_FEE).toBe(0));
  it("intro: 3 families is £35 each", () => expect(partnerFee(3, true).monthly).toBe(105));
  it("intro: 4th family moves to Starter £150", () => expect(partnerFee(4, true).monthly).toBe(150));
  it("no intro: 2 families is Starter £150", () => expect(partnerFee(2, false).monthly).toBe(150));
});
