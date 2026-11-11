import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  signatures: [] as { signer_role: string; signer_name: string; signed_at: string }[],
  existingCopy: false,
  uploads: [] as { path: string; bytes: Uint8Array; options: unknown }[],
  inserts: [] as Record<string, unknown>[],
  audits: [] as unknown[],
  snapshot: "",
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: async (path: string, bytes: Uint8Array, options: unknown) => {
          state.uploads.push({ path, bytes, options });
          return { error: null };
        },
        remove: async () => ({ error: null }),
      }),
    },
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q,
        eq: () => q,
        order: async () => ({ data: state.signatures }),
        insert: async (row: Record<string, unknown>) => {
          state.inserts.push(row);
          return { error: null };
        },
        maybeSingle: async () => {
          if (table === "agreement_versions")
            return { data: { id: "ver-1", family_id: "fam-1", nanny_id: "nan-1", version: 2, snapshot_text: state.snapshot, content_hash: "abc123", issued_at: "2026-11-01T10:00:00Z" } };
          if (table === "wallet_documents") return { data: state.existingCopy ? { id: "doc-1" } : null };
          if (table === "families") return { data: { family_name: "Harrington" } };
          return { data: null };
        },
      };
      return q;
    },
  },
}));
vi.mock("./audit.server", () => ({ audit: async (e: unknown) => void state.audits.push(e) }));

import { defaultAgreementData, normalizeAgreement } from "./agreement.model";
import { saveSignedCopy, trySaveSignedCopy } from "./agreement-pdf.server";
import { snapshotAgreement } from "./agreement-versions";

const sig = (role: string, name: string) => ({ signer_role: role, signer_name: name, signed_at: "2026-11-02T09:30:00Z" });

beforeEach(() => {
  state.signatures = [];
  state.existingCopy = false;
  state.uploads = [];
  state.inserts = [];
  state.audits = [];
  state.snapshot = snapshotAgreement({ ...normalizeAgreement(defaultAgreementData), employerName: "Harrington family", nannyName: "Jess" }).text;
});

describe("saving a signed record copy", () => {
  it("waits until both the parent and the nanny have signed", async () => {
    state.signatures = [sig("parent", "Sam Harrington")];
    expect(await saveSignedCopy("ver-1")).toEqual({ saved: false, reason: "not_fully_signed" });
    expect(state.uploads).toEqual([]);
  });

  it("stores a real PDF of the stored wording in the vault once both have signed", async () => {
    state.signatures = [sig("parent", "Sam Harrington"), sig("nanny", "Jess Taylor")];
    expect(await saveSignedCopy("ver-1")).toEqual({ saved: true });
    expect(state.uploads).toHaveLength(1);
    const upload = state.uploads[0]!;
    expect(upload.path).toBe("vault/fam-1/signed-agreement-ver-1.pdf");
    expect(upload.options).toMatchObject({ contentType: "application/pdf", upsert: false });
    const pdf = Buffer.from(upload.bytes).toString("latin1");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("Signed record copy");
    expect(pdf).toContain("Sam Harrington");
    expect(pdf).toContain("Jess Taylor");
    expect(pdf).toContain("abc123");
  });

  it("files it in the household's Documents against the right person, and logs it without the contents", async () => {
    state.signatures = [sig("parent", "Sam Harrington"), sig("nanny", "Jess Taylor")];
    await saveSignedCopy("ver-1");
    expect(state.inserts[0]).toMatchObject({ family_id: "fam-1", nanny_id: "nan-1", category: "agreement", content_type: "application/pdf", storage_path: "vault/fam-1/signed-agreement-ver-1.pdf" });
    expect(state.audits).toEqual([expect.objectContaining({ action: "signed_copy_saved", familyId: "fam-1", meta: { version: 2 } })]);
  });

  it("does nothing a second time", async () => {
    state.signatures = [sig("parent", "Sam"), sig("nanny", "Jess")];
    state.existingCopy = true;
    expect(await saveSignedCopy("ver-1")).toEqual({ saved: false, reason: "already_saved" });
    expect(state.uploads).toEqual([]);
  });

  it("never lets a failure stop the signing it follows", async () => {
    state.snapshot = "{ not json";
    state.signatures = [sig("parent", "Sam"), sig("nanny", "Jess")];
    await expect(trySaveSignedCopy("ver-1")).resolves.toBeUndefined();
    await expect(trySaveSignedCopy(null)).resolves.toBeUndefined();
  });
});
