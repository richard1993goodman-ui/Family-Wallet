import { describe, expect, it } from "vitest";
import { canLinkByEmail, likeLiteral, type LinkCandidate } from "./account-link";

const ok: LinkCandidate = {
  accountEmail: "Pat@Example.com",
  emailVerified: true,
  contactEmail: "pat@example.com ",
  familyStatus: "active",
  owner: { personId: null },
};

describe("linking a wallet by email", () => {
  it("offers the wallet when the verified email matches and the owner has no login", () => {
    expect(canLinkByEmail(ok)).toBe(true);
  });

  it("refuses everything else", () => {
    const refused: Partial<LinkCandidate>[] = [
      { emailVerified: false },
      { accountEmail: null },
      { contactEmail: "someone.else@example.com" },
      { contactEmail: null },
      { familyStatus: "suspended" },
      { familyStatus: "cancelled" },
      { owner: null },
      { owner: { personId: "p1" } }, // already has an owner account: never a takeover
    ];
    for (const change of refused) expect(canLinkByEmail({ ...ok, ...change })).toBe(false);
  });

  it("matches an email literally, so _ and % cannot act as wildcards", () => {
    expect(likeLiteral("a_b%c\\d@x.com")).toBe("a\\_b\\%c\\\\d@x.com");
  });
});
