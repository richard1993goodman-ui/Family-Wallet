// Key documents a household keeps in its private vault.

export const DOCUMENT_CATEGORIES = [
  { value: "dbs", label: "DBS check", hint: "Enhanced DBS certificate or update service check", expires: true },
  { value: "id", label: "ID", hint: "Driving licence or other photo ID", expires: true },
  { value: "passport", label: "Passport", hint: "The photo page", expires: true },
  { value: "right_to_work", label: "Right to work", hint: "Share code check, visa or other proof", expires: true },
  { value: "proof_of_address", label: "Proof of address", hint: "Utility bill or bank statement", expires: false },
  { value: "first_aid", label: "First aid & qualifications", hint: "Paediatric first aid, childcare qualifications", expires: true },
  { value: "insurance", label: "Insurance", hint: "Public liability or car insurance", expires: true },
  { value: "other", label: "Other", hint: "Any other core document", expires: false },
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["value"];

export const isDocumentCategory = (v: unknown): v is DocumentCategory => DOCUMENT_CATEGORIES.some((c) => c.value === v);
export const categoryLabel = (v: string) => DOCUMENT_CATEGORIES.find((c) => c.value === v)?.label ?? "Other";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENTS_PER_FAMILY = 300;

/** The only kinds of file the vault accepts, with the extension each is stored as. */
export const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Checks the first bytes of the file really match what it claims to be, so a renamed file is refused. */
export function matchesFileType(contentType: string, bytes: Uint8Array): boolean {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  switch (contentType) {
    case "application/pdf":
      return starts(0x25, 0x50, 0x44, 0x46); // %PDF
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47);
    case "image/webp":
      return starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50; // RIFF....WEBP
    default:
      return false;
  }
}

export type ExpiryState = "none" | "ok" | "soon" | "expired";

/** How close a document is to running out. "Soon" is the last 60 days. */
export function expiryState(expiresOn: string | null | undefined, today = new Date()): { state: ExpiryState; days: number | null } {
  if (!expiresOn) return { state: "none", days: null };
  const end = Date.parse(`${expiresOn}T00:00:00Z`);
  if (Number.isNaN(end)) return { state: "none", days: null };
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const days = Math.round((end - start) / 86400000);
  return { state: days < 0 ? "expired" : days <= 60 ? "soon" : "ok", days };
}

export type VaultDocument = {
  id: string;
  category: string;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  issuedOn: string | null;
  expiresOn: string | null;
  sharedWithStaff: boolean;
  uploadedBy: "family" | "nanny";
  createdAt: string;
  /** null = the household's own document; otherwise the staff member it belongs to. */
  ownerId: string | null;
  ownerName: string;
  /** The signed-in person may delete it. */
  canDelete: boolean;
};
