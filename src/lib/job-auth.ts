import { createHash, timingSafeEqual } from "node:crypto";

/** True when the request carries `Authorization: Bearer <secret>` with exactly this secret. Constant-time. */
export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  const token = /^Bearer ([^\s,]+)$/.exec(header ?? "")?.[1];
  if (!token) return false;
  const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
  return timingSafeEqual(digest(token), digest(secret));
}
