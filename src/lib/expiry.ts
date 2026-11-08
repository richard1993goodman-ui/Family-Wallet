export type ExpiryState = "none" | "ok" | "soon" | "expired";

const DAY = 24 * 60 * 60 * 1000;

/** A document counts as "soon" within this many days of its expiry date. */
export const EXPIRY_WARNING_DAYS = 60;

/** Whole calendar days from today (UTC) to the expiry date. Negative once it has passed. */
export function expiryInfo(expiresOn: string | null | undefined, now = new Date()) {
  if (!expiresOn) return { state: "none" as ExpiryState, days: null as number | null };
  const expiry = new Date(`${expiresOn}T00:00:00Z`).getTime();
  if (Number.isNaN(expiry)) return { state: "none" as ExpiryState, days: null };
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((expiry - today) / DAY);
  if (days < 0) return { state: "expired" as ExpiryState, days };
  if (days <= EXPIRY_WARNING_DAYS) return { state: "soon" as ExpiryState, days };
  return { state: "ok" as ExpiryState, days };
}

export function expiryLabel(expiresOn: string | null | undefined, now = new Date()) {
  const { state, days } = expiryInfo(expiresOn, now);
  if (state === "none") return null;
  if (state === "expired") return "Expired";
  if (state === "soon") return days === 0 ? "Expires today" : `Expires in ${days} day${days === 1 ? "" : "s"}`;
  return "Valid";
}
