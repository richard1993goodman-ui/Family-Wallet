// A household's funding state. Pure helpers, so the rules are easy to test.
export type Entitlement = "agency_active" | "transition" | "direct_active" | "suspended";

/** Days a family keeps its wallet after an agency releases the seat. Set TRANSITION_GRACE_DAYS to change it. */
export function graceDays(raw = process.env["TRANSITION_GRACE_DAYS"]) {
  const days = Number(raw);
  return Number.isFinite(days) && days >= 0 && days <= 90 ? Math.floor(days) : 7;
}

export const transitionEnd = (now: Date, days = graceDays()) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

/** Only a family still in transition can run out. Unmanaged and direct families never do. */
export function transitionExpired(entitlement: string | null, endsAt: string | null, now = Date.now()) {
  return entitlement === "transition" && !!endsAt && new Date(endsAt).getTime() <= now;
}

/** Whether a wallet may be opened right now. */
export function walletOpen(status: string, entitlement: string | null, endsAt: string | null, now = Date.now()) {
  return status === "active" && !transitionExpired(entitlement, endsAt, now);
}
