import { describe, expect, it } from "vitest";
import { collectFiles, exportFileName, isOwnFile, redact } from "./export";

const id = "11111111-1111-1111-1111-111111111111";

describe("redact", () => {
  it("drops sign-in codes and keeps everything else", () => {
    expect(redact({ name: "A", access_code: "X", access_code_hash: "h", nanny_code_hash: "n", note: "hi" })).toEqual({ name: "A", note: "hi" });
  });
});

describe("isOwnFile", () => {
  it("allows only the household's own folders", () => {
    expect(isOwnFile(id, `vault/${id}/a.pdf`)).toBe(true);
    expect(isOwnFile(id, `moments/${id}/p.jpg`)).toBe(true);
    expect(isOwnFile(id, `${id}/x.png`)).toBe(true);
    expect(isOwnFile(id, "vault/other/a.pdf")).toBe(false);
  });
  it("refuses climbing out, empty names and non-strings", () => {
    expect(isOwnFile(id, `vault/${id}/../other/a.pdf`)).toBe(false);
    expect(isOwnFile(id, `vault/${id}//a.pdf`)).toBe(false);
    expect(isOwnFile(id, `/vault/${id}/a.pdf`)).toBe(false);
    expect(isOwnFile(id, `vault/${id}/`)).toBe(false);
    expect(isOwnFile(id, null)).toBe(false);
  });
});

describe("collectFiles", () => {
  it("lists each own file once and skips foreign paths", () => {
    const files = collectFiles(id, {
      wallet_documents: [{ storage_path: `vault/${id}/a.pdf` }, { storage_path: `vault/${id}/a.pdf` }, { storage_path: "vault/zzz/b.pdf" }],
      family_moments: [{ photo_path: `moments/${id}/p.jpg`, caption: "x" }],
    });
    expect(files.map((f) => f.path)).toEqual([`vault/${id}/a.pdf`, `moments/${id}/p.jpg`]);
  });
});

describe("exportFileName", () => {
  it("is a safe dated name", () => {
    expect(exportFileName("The O'Brien Family!", new Date("2026-11-11T10:00:00Z"))).toBe("family-wallet-the-o-brien-family-2026-11-11.json");
  });
});
