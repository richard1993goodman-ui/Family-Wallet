import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Every table the project creates must switch row-level security on, so a new table can never ship readable
// by the public API. Reads every migration, in both folders.
const DIRS = ["supabase/migrations", "drizzle/migrations"];
const sql = DIRS.flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".sql")).map((f) => readFileSync(`${d}/${f}`, "utf8"))).join("\n");

const created = [...sql.matchAll(/create table (?:if not exists )?(?:public\.)?"?([a-z_]+)"?/gi)].map((m) => m[1]!.toLowerCase());
const secured = new Set([...sql.matchAll(/alter table (?:only )?(?:public\.)?"?([a-z_]+)"? enable row level security/gi)].map((m) => m[1]!.toLowerCase()));

describe("row-level security", () => {
  it("is enabled on every table the migrations create", () => {
    expect(created.length).toBeGreaterThan(40);
    expect(created.filter((t) => !secured.has(t))).toEqual([]);
  });

  it("never grants the public API (anon) access to a table", () => {
    expect(sql).not.toMatch(/grant [a-z, ]+ on (?:table )?public\.[a-z_]+ to anon/i);
  });

  it("keeps the audit log append-only", () => {
    const migration = readFileSync("supabase/migrations/20261111300000_audit_log.sql", "utf8");
    expect(migration).toMatch(/revoke update, delete, truncate on public\.audit_log/);
  });
});
