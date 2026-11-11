import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  collectFiles,
  EXPORT_TABLES,
  exportFileName,
  isOwnFile,
  redact,
  type ExportFile,
} from "./export";
import { daysLeft } from "./lifecycle";
import { hasCredential } from "./wallet.server";

const PAGE = 1000;

/** Every row for a household, a page at a time, since the database returns at most a thousand rows per request. */
async function fetchAll(table: string, column: string, values: string | string[]) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const query = supabaseAdmin
      .from(table as never)
      .select("*")
      .range(from, from + PAGE - 1);
    const { data, error } = await (Array.isArray(values)
      ? query.in(column, values)
      : query.eq(column, values));
    if (error) return { rows, error: error.message };
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if ((data?.length ?? 0) < PAGE) return { rows, error: null };
  }
}

type FamilyRow = {
  id: string;
  family_name: string;
  status: string;
  locked_at: string | null;
  delete_after: string | null;
};

async function familyBySlug(slug: string): Promise<FamilyRow | null> {
  // The lifecycle columns are not in the generated types until the migration is applied, so read them loosely.
  const full = await supabaseAdmin
    .from("families")
    .select("id, family_name, status, locked_at, delete_after" as "id")
    .eq("slug", slug)
    .maybeSingle();
  if (!full.error) return (full.data as unknown as FamilyRow | null) ?? null;
  const plain = await supabaseAdmin
    .from("families")
    .select("id, family_name, status")
    .eq("slug", slug)
    .maybeSingle();
  return plain.data ? { ...plain.data, locked_at: null, delete_after: null } : null;
}

/** Whether this device holds the household's code, and where the wallet stands. Parents only, and works while locked. */
export async function exportStatus(slug: string) {
  if (slug === "demo" || !(await hasCredential(slug))) return null;
  const family = await familyBySlug(slug);
  if (!family) return null;
  const locked = family.status === "suspended" || family.status === "cancelled";
  return {
    familyName: family.family_name,
    locked,
    deleteAfter: locked ? family.delete_after : null,
    daysLeft:
      locked && family.delete_after ? daysLeft(new Date(), new Date(family.delete_after)) : null,
  };
}

/** The household's data as one document, plus the list of its files. Nothing secret is included. */
export async function buildExport(slug: string) {
  if (slug === "demo" || !(await hasCredential(slug))) return null;
  const family = await familyBySlug(slug);
  if (!family) return null;

  const tables: Record<string, Record<string, unknown>[]> = {};
  const problems: string[] = [];
  for (const table of EXPORT_TABLES) {
    const { rows, error } = await fetchAll(table, "family_id", family.id);
    tables[table] = rows.map((r) => redact(r));
    if (error) problems.push(`${table}: ${error}`);
  }
  // Messages hang off conversations rather than the household itself.
  for (const [messages, threads] of [
    ["household_messages", "household_threads"],
    ["support_messages", "support_threads"],
  ] as const) {
    const ids = (tables[threads] ?? []).map((t) => String(t["id"]));
    if (ids.length) {
      const { rows, error } = await fetchAll(messages, "thread_id", ids);
      tables[messages] = rows;
      if (error) problems.push(`${messages}: ${error}`);
    }
  }
  const { data: household } = await supabaseAdmin
    .from("families")
    .select("*")
    .eq("id", family.id)
    .maybeSingle();
  const files = collectFiles(family.id, {
    ...tables,
    family: household ? [redact(household)] : [],
  });

  const now = new Date();
  const { audit } = await import("./audit.server");
  await audit({
    actorKind: "parent",
    action: "data_exported",
    familyId: family.id,
    meta: { tables: Object.keys(tables).length, files: files.length },
  });
  return {
    fileName: exportFileName(family.family_name, now),
    json: JSON.stringify(
      {
        about:
          "A copy of the data held in your Family Wallet. Sign-in codes are not included. Files such as photos and documents are listed under 'files' and downloaded separately.",
        exportedAt: now.toISOString(),
        household: household ? redact(household) : null,
        tables,
        files,
        ...(problems.length ? { notExported: problems } : {}),
      },
      null,
      2,
    ),
    files,
  };
}

/** A short-lived download link for one of the household's own files. Refuses any path outside its own folders. */
export async function exportFileLink(slug: string, path: string) {
  if (slug === "demo" || !(await hasCredential(slug))) return null;
  const family = await familyBySlug(slug);
  if (!family || !isOwnFile(family.id, path)) return null;
  const { data } = await supabaseAdmin.storage.from("family-docs").createSignedUrl(path, 120);
  return data?.signedUrl ?? null;
}

export type { ExportFile };
