import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// The owner can open any family's records. Each of these actions must leave a line in the audit log.
const SENSITIVE: Record<string, string> = {
  getFamily: "family_record_opened",
  getFamilyHub: "family_hub_opened",
  getAdminDocumentUrl: "document_opened",
  setFamilyStatus: "status_changed",
  regenerateCode: "code_regenerated",
  deleteFamily: "family_deleted",
  deleteDocument: "document_deleted",
};

const source = readFileSync("src/lib/admin.functions.ts", "utf8");
const body = (name: string) => {
  const start = source.indexOf(`export const ${name} =`);
  const next = source.indexOf("\nexport const ", start + 1);
  return source.slice(start, next === -1 ? undefined : next);
};

describe("owner access leaves a trail", () => {
  for (const [fn, action] of Object.entries(SENSITIVE)) {
    it(`${fn} logs ${action}, after the access check and before doing anything`, () => {
      const text = body(fn);
      const checked = Math.max(text.indexOf("assertFamilyInScope"), text.indexOf("assertPathInScope"), text.indexOf("assertRowInScope"));
      const logged = text.indexOf(`"${action}"`);
      expect(checked).toBeGreaterThan(-1);
      expect(logged).toBeGreaterThan(checked);
    });
  }

  it("never puts codes, tokens or file paths in what it records", () => {
    const calls = [...source.matchAll(/auditOwner\(([^;]*)\);/g)].map((m) => m[1]!);
    expect(calls.length).toBe(Object.keys(SENSITIVE).length);
    for (const c of calls) expect(c).not.toMatch(/code\b(?!_regenerated)|token|storagePath\b(?!\.split)|base64/i);
  });
});

describe("auditOwner", () => {
  it("records the owner, the signed-in user and the family, and nothing else", async () => {
    const rows: unknown[] = [];
    vi.doMock("@/integrations/supabase/client.server", () => ({
      supabaseAdmin: { from: () => ({ insert: async (r: unknown) => (rows.push(r), { error: null }) }) },
    }));
    const { auditOwner } = await import("./audit.server");
    await auditOwner({ userId: "u1" }, "family_record_opened", "f1");
    expect(rows).toEqual([
      expect.objectContaining({ actor_kind: "owner", actor_id: "u1", action: "family_record_opened", family_id: "f1", meta: {} }),
    ]);
  });
});
