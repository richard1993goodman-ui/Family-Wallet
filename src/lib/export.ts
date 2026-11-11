// What a household's data export contains and which files may be downloaded with it. Pure, so the safety rules are easy
// to test: nothing secret leaves in the export, and a link can only ever reach this household's own files.

/** Household tables that carry a `family_id`. Each is exported in full. */
export const EXPORT_TABLES = [
  "family_profile", "family_children", "family_contacts", "family_services", "family_nannies", "family_documents", "wallet_documents",
  "family_moments", "daily_logs", "care_events", "medication_doses", "incident_reports", "handover_checklists",
  "planner_entries", "leave_requests", "cover_requests", "timesheet_shifts", "shift_sessions", "nanny_work_hours", "live_in_settings", "live_in_weeks",
  "expense_claims", "petty_cash_entries", "nanny_bank_details", "nanny_safety_documents",
  "nanny_agreements", "agreement_versions", "document_signatures",
  "house_manual_entries", "household_permissions", "kids_playbook_entries", "sports_passport_entries", "travel_trips",
  "review_checkins", "training_attempts", "welcome_checkins", "welcome_progress", "household_threads", "support_threads",
] as const;

/** Never exported: the hashed or readable sign-in codes. Everything else in a household's own tables is theirs. */
const REDACTED = new Set(["access_code", "access_code_hash", "nanny_code", "nanny_code_hash"]);
export const redact = <T extends Record<string, unknown>>(row: T): Partial<T> =>
  Object.fromEntries(Object.entries(row).filter(([key]) => !REDACTED.has(key))) as Partial<T>;

/** The only places in the private bucket a household's own files live. */
export const filePrefixes = (familyId: string) => [`vault/${familyId}/`, `moments/${familyId}/`, `${familyId}/`];

/** True only for a path inside this household's own folders, with no way to climb out of them. */
export function isOwnFile(familyId: string, path: unknown): path is string {
  if (typeof path !== "string" || path.length === 0 || path.length > 500) return false;
  if (path.includes("..") || path.includes("//") || path.startsWith("/") || path.includes("\\")) return false;
  return filePrefixes(familyId).some((prefix) => path.startsWith(prefix) && path.length > prefix.length);
}

const PATH_FIELDS = new Set(["storage_path", "photo_path", "parent_photo_path", "image_path", "file_path"]);
export type ExportFile = { table: string; field: string; path: string };

/** Every stored file the exported rows point at, once each, and only those inside the household's own folders. */
export function collectFiles(familyId: string, tables: Record<string, Record<string, unknown>[]>): ExportFile[] {
  const seen = new Set<string>();
  const files: ExportFile[] = [];
  for (const [table, rows] of Object.entries(tables)) {
    for (const row of rows) {
      for (const [field, value] of Object.entries(row)) {
        if (PATH_FIELDS.has(field) && isOwnFile(familyId, value) && !seen.has(value)) {
          seen.add(value);
          files.push({ table, field, path: value });
        }
      }
    }
  }
  return files;
}

export const exportFileName = (familyName: string, on: Date) => {
  const slug = familyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "household";
  return `family-wallet-${slug}-${on.toISOString().slice(0, 10)}.json`;
};
