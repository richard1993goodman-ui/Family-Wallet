import { describe, expect, it } from "vitest";
import { pettyCashBalance } from "./petty-cash.types";

describe("petty cash balance", () => {
  it("subtracts nanny spending from the family's float", () => {
    expect(
      pettyCashBalance([
        { kind: "topup", amount: 100 },
        { kind: "spend", amount: 12.4 },
        { kind: "spend", amount: 8 },
        { kind: "spend", amount: 21.5 },
      ]),
    ).toBe(58.1);
  });
  it("goes negative when the nanny is owed money", () => {
    expect(pettyCashBalance([{ kind: "topup", amount: 10 }, { kind: "spend", amount: 15.5 }])).toBe(-5.5);
  });
});
