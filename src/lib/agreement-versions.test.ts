import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultAgreementData, normalizeAgreement } from "./agreement.model";
import { hashText, snapshotAgreement } from "./agreement-versions";

describe("agreement snapshots", () => {
  it("are the same however the keys happen to be ordered", () => {
    expect(snapshotAgreement({ a: 1, b: { y: 2, x: 3 } })).toEqual(snapshotAgreement({ b: { x: 3, y: 2 }, a: 1 }));
  });

  it("change when any wording changes", () => {
    const base = normalizeAgreement(defaultAgreementData);
    const edited = { ...base, holidayAllowance: "A different holiday clause" };
    expect(snapshotAgreement(edited).hash).not.toBe(snapshotAgreement(base).hash);
  });

  it("hash the stored text, so a stored version can be re-checked later", () => {
    const { text, hash } = snapshotAgreement(normalizeAgreement(defaultAgreementData));
    expect(hashText(text)).toBe(hash);
  });

  it("stay equal after normalising again, so an unedited agreement is never mistaken for an edited one", () => {
    const once = normalizeAgreement(defaultAgreementData);
    expect(snapshotAgreement(normalizeAgreement(once)).text).toBe(snapshotAgreement(once).text);
    const stored = JSON.parse(snapshotAgreement(once).text);
    expect(snapshotAgreement(normalizeAgreement(stored)).text).toBe(snapshotAgreement(once).text);
  });
});

describe("agreement version history", () => {
  const migration = readFileSync("supabase/migrations/20261111420000_agreement_versions.sql", "utf8");
  it("cannot be updated, removed or truncated by anyone", () => {
    expect(migration).toMatch(/revoke update, delete, truncate on public\.agreement_versions from anon, authenticated, service_role/);
  });
  it("is only ever added to by the code", () => {
    const code = readFileSync("src/lib/agreement.server.ts", "utf8");
    expect(code).not.toMatch(/from\("agreement_versions"\)\s*\.(update|delete)/);
  });
});
