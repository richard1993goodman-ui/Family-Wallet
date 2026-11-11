// Fixed, comparable text for an agreement, so a version can be hashed and later checked. Pure.
import { createHash } from "node:crypto";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  }
  return value;
}

/** The agreement as stable JSON text (keys in a fixed order) and its SHA-256. */
export function snapshotAgreement(data: unknown) {
  const text = JSON.stringify(sortKeys(data));
  return { text, hash: createHash("sha256").update(text).digest("hex") };
}

export const hashText = (text: string) => createHash("sha256").update(text).digest("hex");
