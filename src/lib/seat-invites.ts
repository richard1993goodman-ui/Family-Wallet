// Pure helpers for agency household seats, kept separate so they are easy to test.
import { createHash, randomBytes } from "node:crypto";

/** How long an unused invitation lasts. 48 hours by default; set INVITE_HOURS to change it (1 to 336). */
export function inviteHours(raw = process.env["INVITE_HOURS"]) {
  const hours = Number(raw);
  return Number.isFinite(hours) && hours >= 1 && hours <= 336 ? Math.floor(hours) : 48;
}
export const inviteExpiry = (now = Date.now()) => new Date(now + inviteHours() * 60 * 60 * 1000).toISOString();
/** Agencies with no fixed allowance (enterprise) can still never hold more than this many seats. */
export const MAX_SEATS = 1000;

export const newInviteToken = () => randomBytes(32).toString("base64url");
export const hashInviteToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** A short backup code to type at /join if the link will not open. Unambiguous letters and digits, 8 characters. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newBackupCode() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
export const normaliseBackupCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
export const hashBackupCode = (code: string) => createHash("sha256").update(`invite-code:${normaliseBackupCode(code)}`).digest("hex");

export const normaliseEmail = (email: string) => email.trim().toLowerCase();
export const isValidEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export type SeatState = "available" | "invited" | "occupied";
export type InviteRow = { id: string; slot: number; email: string; nanny_email?: string | null; status: string; invited_at: string; expires_at: string | null };
export type Seat = { slot: number; state: SeatState; inviteId: string | null; email: string | null; nannyEmail: string | null; invitedAt: string | null; expiresAt: string | null };

/** Fixed-size agencies show exactly their allowance; open-ended ones show a few spare slots. */
export function seatCount(allowance: number | null, rows: InviteRow[]) {
  const highest = rows.reduce((max, r) => Math.max(max, r.slot), 0);
  return Math.min(MAX_SEATS, Math.max(allowance ?? highest + 5, highest));
}

/** Slots 1..n. An expired pending invite no longer holds its seat. */
export function buildSeats(allowance: number | null, rows: InviteRow[], now = Date.now()): Seat[] {
  const live = rows.filter((r) => r.status === "accepted" || (r.status === "pending" && (!r.expires_at || new Date(r.expires_at).getTime() > now)));
  const bySlot = new Map(live.map((r) => [r.slot, r]));
  return Array.from({ length: seatCount(allowance, rows) }, (_, i) => {
    const row = bySlot.get(i + 1);
    return row
      ? { slot: i + 1, state: row.status === "accepted" ? "occupied" : "invited", inviteId: row.id, email: row.email, nannyEmail: row.nanny_email ?? null, invitedAt: row.invited_at, expiresAt: row.expires_at }
      : { slot: i + 1, state: "available", inviteId: null, email: null, nannyEmail: null, invitedAt: null, expiresAt: null };
  });
}
