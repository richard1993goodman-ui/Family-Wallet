import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Access codes are kept readable only until first use. These checks stop a new write path or a reveal path
// from quietly bringing back long-term plain-text codes.
const wallet = readFileSync("src/lib/wallet.server.ts", "utf8");

describe("access code retention", () => {
  it("clears the readable family code when the family first signs in with it", () => {
    expect(wallet).toMatch(/update\(\{ access_code: null \}\)\.eq\("slug", slug\)/);
  });
  it("clears the readable staff code when the staff member first signs in with it", () => {
    expect(wallet).toMatch(/update\(\{ nanny_code: null \}\)\.eq\("id", matched\.id\)/);
  });
  it("never regenerates a staff code just because the readable copy was cleared", () => {
    expect(wallet).toMatch(/regenerate \|\| \(!code && !nanny\.nanny_code_hash\)/);
  });
});
