// Who may open a household, and as what. Pure, so the rules are easy to test.
// During the dual-run an account login and a code login both resolve to the same shape.

export type Access = { level: "family" | "nanny"; nannyId: string | null };

export type Membership = {
  status: "invited" | "active" | "revoked" | "ended";
  role: "owner" | "co_parent" | "staff";
  nannyId: string | null;
};

/** What an account membership grants, or nothing unless it is active. */
export function accessFromMembership(m: Membership | null): Access | null {
  if (!m || m.status !== "active") return null;
  return m.role === "staff"
    ? { level: "nanny", nannyId: m.nannyId }
    : { level: "family", nannyId: null };
}

/**
 * Account first, then the code session. A person whose membership was revoked or ended is refused even if an old
 * code cookie is still on their device: `blocked` is true when the code session belongs to a membership that is not active.
 */
export function chooseAccess(
  account: Access | null,
  code: Access | null,
  blocked = false,
): Access | null {
  if (account) return account;
  if (blocked) return null;
  return code;
}
