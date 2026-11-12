import { describe, expect, it, vi } from "vitest";
import { deletionConfirmed } from "./lifecycle";

describe("confirming a deletion by typing the family name", () => {
  it("accepts the name ignoring case and extra spaces", () => {
    expect(deletionConfirmed("harrington", "Harrington")).toBe(true);
    expect(deletionConfirmed("  The  Harringtons ", "The Harringtons")).toBe(true);
  });

  it("refuses an empty, partial or different name", () => {
    for (const typed of ["", "   ", "Harring", "Harringtons", "Someone Else"])
      expect(deletionConfirmed(typed, "Harrington")).toBe(false);
  });

  it("never matches when the family has no name", () => {
    expect(deletionConfirmed("", "")).toBe(false);
  });
});

describe("requesting deletion", () => {
  const load = async (family: { id: string; family_name: string } | null) => {
    vi.resetModules();
    const updates: unknown[] = [];
    const audits: unknown[] = [];
    vi.doMock("@/integrations/supabase/client.server", () => ({
      supabaseAdmin: {
        from: () => ({
          update: (row: unknown) => (updates.push(row), { eq: async () => ({ error: null }) }),
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { delete_after: "2026-12-12T00:00:00Z" } }),
            }),
          }),
        }),
      },
    }));
    vi.doMock("./family.server", () => ({ requireFamily: async () => family }));
    vi.doMock("./audit.server", () => ({ audit: async (e: unknown) => void audits.push(e) }));
    vi.doMock("./email.server", () => ({ sendEmail: async () => true }));
    const { requestOwnerDeletion } = await import("./lifecycle.server");
    return { requestOwnerDeletion, updates, audits };
  };

  it("refuses someone who has not opened the wallet", async () => {
    const { requestOwnerDeletion, updates } = await load(null);
    await expect(requestOwnerDeletion("h", "Harrington")).rejects.toThrow(/open your wallet/i);
    expect(updates).toEqual([]);
  });

  it("changes nothing when the typed name is wrong", async () => {
    const { requestOwnerDeletion, updates, audits } = await load({
      id: "f1",
      family_name: "Harrington",
    });
    await expect(requestOwnerDeletion("h", "Nope")).rejects.toThrow(/exactly/i);
    expect(updates).toEqual([]);
    expect(audits).toEqual([]);
  });

  it("locks the wallet, records it, and returns the deletion date", async () => {
    const { requestOwnerDeletion, updates, audits } = await load({
      id: "f1",
      family_name: "Harrington",
    });
    await expect(requestOwnerDeletion("h", "harrington")).resolves.toEqual({
      deleteAfter: "2026-12-12T00:00:00Z",
    });
    expect(updates).toEqual([expect.objectContaining({ status: "cancelled" })]);
    expect(audits).toEqual([
      expect.objectContaining({ action: "deletion_requested", familyId: "f1" }),
    ]);
  });
});
