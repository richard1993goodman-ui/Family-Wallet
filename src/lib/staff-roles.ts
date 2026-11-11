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

/** Staff included on a plan the family bought themselves. Households added by an agency have no plan limit. */
export const SELF_SERVE_STAFF_LIMIT: Record<"family" | "household", number> = {
  family: 2,
  household: 6,
};

/** Ceiling for households set up by an agency, as a safety guard. */
export const AGENCY_STAFF_LIMIT = 6;

export type StaffLimit = {
  limit: number;
  /** "Family", "Household", or null for an agency household. */
  planName: string | null;
  /** True when more staff would need a bigger plan. */
  upgradeable: boolean;
};

export function staffLimitFor(plan: "family" | "household" | null | undefined): StaffLimit {
  if (!plan) return { limit: AGENCY_STAFF_LIMIT, planName: null, upgradeable: false };
  return {
    limit: SELF_SERVE_STAFF_LIMIT[plan],
    planName: plan === "family" ? "Family" : "Household",
    upgradeable: plan === "family",
  };
}
