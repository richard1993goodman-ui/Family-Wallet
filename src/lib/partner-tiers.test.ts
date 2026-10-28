import { describe, expect, it } from "vitest";
import { PARTNER_SETUP_FEE, tierFor } from "./partner-tiers";

describe("partner tiers", () => {
  it("1-5 families is £125", () => expect(tierFor(5).monthly).toBe(125));
  it("6-10 families is £225", () => expect(tierFor(6).monthly).toBe(225));
  it("11-15 families is £300", () => expect(tierFor(15).monthly).toBe(300));
  it("16-20 families is £375", () => expect(tierFor(20).monthly).toBe(375));
  it("21-30 families is £500", () => expect(tierFor(30).monthly).toBe(500));
  it("over 30 is custom", () => expect(tierFor(31).monthly).toBeNull());
  it("no setup fee", () => expect(PARTNER_SETUP_FEE).toBe(0));
});
