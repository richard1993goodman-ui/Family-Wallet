import { beforeEach, describe, expect, it, vi } from "vitest";
import { expiryState, matchesFileType } from "./documents.types";

const state = vi.hoisted(() => ({
  me: { level: "family" as "family" | "nanny", nannyId: null as string | null },
  rows: [] as Record<string, unknown>[],
  stored: [] as string[],
  removed: [] as string[],
}));

vi.mock("./family.server", () => ({
  requireSharedFamily: async () => ({ id: "fam1", family_name: "Harrington", access: state.me.level }),
}));
vi.mock("./wallet.server", () => ({ sessionAccess: async () => ({ level: state.me.level, nannyId: state.me.nannyId }) }));
vi.mock("./notifications.server", () => ({ notifyOther: async () => undefined }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: async (path: string) => { state.stored.push(path); return { error: null }; },
        remove: async (paths: string[]) => { state.removed.push(...paths); return { error: null }; },
        createSignedUrl: async () => ({ data: { signedUrl: "https://signed.example/doc" } }),
      }),
    },
    from: (table: string) => {
      let filter: Record<string, unknown> = {};
      let head = false;
      const q: Record<string, unknown> = {
        select: (_c?: string, opts?: { head?: boolean }) => { head = !!opts?.head; return q; },
        eq: (k: string, v: unknown) => { filter[k] = v; return q; },
        order: () => q,
        insert: async (row: Record<string, unknown>) => { state.rows.push({ id: `doc${state.rows.length + 1}`, created_at: "2026-01-01T00:00:00Z", ...row }); return { error: null }; },
        delete: () => ({ eq: async (_k: string, v: unknown) => { state.rows = state.rows.filter((r) => r["id"] !== v); return { error: null }; } }),
        maybeSingle: async () => {
          if (table === "family_nannies") return { data: ["jess", "mia"].includes(String(filter["id"])) ? { id: filter["id"] } : null };
          return { data: state.rows.find((r) => Object.entries(filter).every(([k, v]) => r[k] === v)) ?? null };
        },
        then: (resolve: (v: unknown) => void) => {
          if (table === "family_nannies") return resolve({ data: [{ id: "jess", name: "Jess", role: "nanny" }, { id: "mia", name: "Mia", role: "au_pair" }] });
          const data = state.rows.filter((r) => Object.entries(filter).every(([k, v]) => k === "family_id" ? r["family_id"] === v : r[k] === v));
          return resolve(head ? { count: data.length } : { data });
        },
      };
      void filter;
      filter = {};
      return q;
    },
  },
}));

import { deleteDocument, documentLink, listDocuments, uploadDocument } from "./documents.server";

const PDF = Buffer.from("%PDF-1.4 test").toString("base64");
const doc = (over: Record<string, unknown> = {}) => ({ ownerId: null, category: "passport", fileName: "p.pdf", contentType: "application/pdf", base64: PDF, ...over });

beforeEach(() => {
  state.me = { level: "family", nannyId: null };
  state.rows = [];
  state.stored = [];
  state.removed = [];
});

describe("file checks", () => {
  it("accepts a file only when its bytes match its type", () => {
    expect(matchesFileType("application/pdf", Buffer.from("%PDF-1.7"))).toBe(true);
    expect(matchesFileType("application/pdf", Buffer.from("MZ not a pdf"))).toBe(false);
    expect(matchesFileType("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(matchesFileType("image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
    expect(matchesFileType("text/html", Buffer.from("<html>"))).toBe(false);
  });

  it("flags documents that have expired or soon will", () => {
    const today = new Date(Date.UTC(2026, 5, 1));
    expect(expiryState("2026-05-31", today).state).toBe("expired");
    expect(expiryState("2026-07-15", today).state).toBe("soon");
    expect(expiryState("2027-06-01", today).state).toBe("ok");
    expect(expiryState(null, today).state).toBe("none");
  });
});

describe("document vault access", () => {
  it("stores a parent's upload under a random private path with no name in it", async () => {
    await uploadDocument("harrington-ab12", doc());
    expect(state.stored).toHaveLength(1);
    expect(state.stored[0]).toMatch(/^vault\/fam1\/[0-9a-f-]{36}\.pdf$/);
  });

  it("refuses a renamed file whose contents are not what it claims", async () => {
    await expect(uploadDocument("harrington-ab12", doc({ base64: Buffer.from("not a pdf").toString("base64") }))).rejects.toThrow("doesn't look like a real");
    expect(state.stored).toHaveLength(0);
  });

  it("refuses unsupported file types and oversized files", async () => {
    await expect(uploadDocument("harrington-ab12", doc({ contentType: "application/zip" }))).rejects.toThrow("PDF, JPG, PNG or WebP");
    const big = Buffer.alloc(10 * 1024 * 1024 + 1, 0x25).toString("base64");
    await expect(uploadDocument("harrington-ab12", doc({ base64: big }))).rejects.toThrow("under 10MB");
  });

  it("lets staff add documents only for themselves", async () => {
    state.me = { level: "nanny", nannyId: "jess" };
    await expect(uploadDocument("harrington-ab12", doc({ ownerId: "mia" }))).rejects.toThrow("only add your own");
    await expect(uploadDocument("harrington-ab12", doc({ ownerId: null }))).rejects.toThrow("only add your own");
    await expect(uploadDocument("harrington-ab12", doc({ ownerId: "jess", category: "dbs" }))).resolves.toEqual({ ok: true });
  });

  it("shows staff their own documents and shared household ones, never another person's or the private ones", async () => {
    state.me = { level: "family", nannyId: null };
    await uploadDocument("h", doc({ ownerId: "jess", category: "dbs" }));
    await uploadDocument("h", doc({ ownerId: "mia", category: "passport" }));
    await uploadDocument("h", doc({ ownerId: null, category: "id", sharedWithStaff: true }));
    await uploadDocument("h", doc({ ownerId: null, category: "passport", sharedWithStaff: false }));

    expect((await listDocuments("h"))!.documents).toHaveLength(4);

    state.me = { level: "nanny", nannyId: "jess" };
    const seen = (await listDocuments("h"))!.documents.map((d) => `${d.ownerName}:${d.category}`);
    expect(seen.sort()).toEqual(["Harrington:id", "Jess:dbs"]);
  });

  it("will not open a document staff cannot see", async () => {
    await uploadDocument("h", doc({ ownerId: "mia" }));
    const id = String(state.rows[0]!["id"]);
    state.me = { level: "nanny", nannyId: "jess" };
    await expect(documentLink("h", id)).rejects.toThrow("not found");
    state.me = { level: "family", nannyId: null };
    await expect(documentLink("h", id)).resolves.toEqual({ url: "https://signed.example/doc" });
  });

  it("only the person who added a document, or a parent, can delete it", async () => {
    state.me = { level: "family", nannyId: null };
    await uploadDocument("h", doc({ ownerId: "jess" })); // parent adds for Jess
    const parentAdded = String(state.rows[0]!["id"]);
    state.me = { level: "nanny", nannyId: "jess" };
    await uploadDocument("h", doc({ ownerId: "jess" })); // Jess adds her own
    const ownAdded = String(state.rows[1]!["id"]);

    await expect(deleteDocument("h", parentAdded)).rejects.toThrow("Only the person who added");
    await expect(deleteDocument("h", ownAdded)).resolves.toEqual({ ok: true });
    expect(state.removed).toHaveLength(1);
  });
});
