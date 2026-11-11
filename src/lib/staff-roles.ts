// What someone does in the household. Shown in the "Role" dropdown when adding staff.

export const STAFF_ROLES = [
  { value: "nanny", label: "Nanny" },
  { value: "au_pair", label: "Au pair" },
  { value: "maternity_nurse", label: "Maternity nurse" },
  { value: "housekeeper", label: "Housekeeper" },
  { value: "cook", label: "Cook" },
  { value: "driver", label: "Driver" },
  { value: "personal_assistant", label: "Personal assistant" },
  { value: "tutor", label: "Tutor" },
  { value: "other", label: "Other" },
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number]["value"];

export const isStaffRole = (value: unknown): value is StaffRole =>
  STAFF_ROLES.some((r) => r.value === value);

export function roleLabel(value: string | null | undefined) {
  return STAFF_ROLES.find((r) => r.value === value)?.label ?? "Staff";
}

/**
 * What to call the household's staff in labels: the one role they all share ("nanny", "au pair"), or "staff"
 * when there are several kinds. A household with nobody added yet is shown "nanny", the most common first hire.
 */
export function staffNoun(roles: (string | null | undefined)[]) {
  const kinds = [...new Set(roles.filter((r): r is string => !!r))];
  if (kinds.length === 0) return "nanny";
  if (kinds.length > 1 || kinds[0] === "other") return "staff";
  return roleLabel(kinds[0]).toLowerCase();
}

/** Independent families have no staff cap; this is only a safety ceiling against runaway input. */
export const SELF_SERVE_STAFF_LIMIT = 100;

/** Ceiling for households set up by an agency, as a safety guard. */
export const AGENCY_STAFF_LIMIT = 6;

export type StaffLimit = {
  limit: number;
  /** "Family", or null for an agency household. */
  planName: string | null;
  /** True when more staff would need a bigger plan. */
  upgradeable: boolean;
};

export function staffLimitFor(plan: "family" | null | undefined): StaffLimit {
  if (!plan) return { limit: AGENCY_STAFF_LIMIT, planName: null, upgradeable: false };
  return { limit: SELF_SERVE_STAFF_LIMIT, planName: "Family", upgradeable: false };
}
