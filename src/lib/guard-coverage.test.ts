import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The server reads family data with the all-access (service) key, so the only thing keeping one household's data
// from another is a check in the code. This test fails the build if a feature that uses that key shows no check at
// all, so a new feature cannot quietly ship open. (It proves a check is present, not that it is right: the
// per-feature tests and supabase/tests/rls_isolation.sql cover behaviour.)

const USES_SERVICE_KEY = /client\.server|supabaseAdmin/;
const CHECKS = new RegExp(
  [
    "requireFamily",
    "requireSharedFamily",
    "requireStaff",
    "requireOwner",
    "requireFamilyStaff",
    "assertFamilyInScope",
    "assertRowInScope",
    "assertPathInScope",
    "assertContentRow",
    "requireContentScope",
    "requireSupabaseAuth",
    "requireTwoStep",
    "assertTwoStep",
    "bearerMatches",
    "authenticateCronRequest",
    "isUnlocked",
    "sessionAccess",
    "hasCredential",
    "resolveNanny",
    "accessLevel",
    "isNannyUnlocked",
  ].join("|"),
);

/** Files that use the key with no check of their own, and why that is acceptable. Shrink this list, never grow it casually. */
const NO_OWN_CHECK: Record<string, string> = {
  "src/lib/audit": "writes the audit log for callers that are already checked",
  "src/lib/push": "sends push messages for callers that are already checked",
  "src/lib/seats": "seat arithmetic called by agency functions that check the agency first",
  "src/lib/agency-tiers": "plan arithmetic called by agency functions that check the agency first",
  "src/lib/agreement-mode": "reads a setting for a family id its caller has already checked",
  "src/lib/agreement-pdf":
    "renders a PDF for an agreement its caller has already loaded and checked",
  "src/lib/staff-setup":
    "public by design: always gives the same answer, only emails the owner added",
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const features = new Map<string, string[]>();
for (const file of [...walk("src/lib"), ...walk("src/routes/api")]) {
  if (!/\.tsx?$/.test(file) || /\.(test|types)\.ts$/.test(file)) continue;
  const feature = file.replace(/\.(functions|server)\.tsx?$/, "").replace(/\.tsx?$/, "");
  features.set(feature, [...(features.get(feature) ?? []), file]);
}

const text = (files: string[]) => files.map((f) => readFileSync(f, "utf8")).join("\n");
const withKey = [...features].filter(([, files]) => USES_SERVICE_KEY.test(text(files)));
const unchecked = withKey.filter(([, files]) => !CHECKS.test(text(files))).map(([name]) => name);

describe("who may use the all-access key", () => {
  it("sees a realistic number of features (guards against this test going blind)", () => {
    expect(withKey.length).toBeGreaterThan(30);
  });

  it("every feature that uses it shows an access check, or is a listed exception", () => {
    expect(unchecked.filter((name) => !(name in NO_OWN_CHECK))).toEqual([]);
  });

  it("keeps the exception list honest: no entry that has since gained a check or disappeared", () => {
    expect(Object.keys(NO_OWN_CHECK).filter((name) => !unchecked.includes(name))).toEqual([]);
  });
});
