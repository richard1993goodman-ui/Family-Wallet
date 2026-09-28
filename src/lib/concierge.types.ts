export const PAYROLL_STATUSES = [
  ["not_started", "Not started"],
  ["details_needed", "Details needed"],
  ["introduction_requested", "Introduction requested"],
  ["setup_in_progress", "Setup in progress"],
  ["payroll_ready", "Payroll ready"],
] as const;

export const CURATION_STATUSES = [
  ["not_started", "Not started"],
  ["brief_received", "Brief received"],
  ["search_underway", "Search underway"],
  ["shortlist_sent", "Shortlist sent privately"],
  ["interviews", "Interviews underway"],
  ["placement_made", "Placement made"],
  ["paused", "Paused"],
] as const;

export type PayrollStatus = (typeof PAYROLL_STATUSES)[number][0];
export type CurationStatus = (typeof CURATION_STATUSES)[number][0];

export const statusLabel = (rows: readonly (readonly [string, string])[], value: string) =>
  rows.find(([key]) => key === value)?.[1] ?? "Not started";

export const SAFETY_DOCUMENTS = [
  ["dbs", "Enhanced DBS"],
  ["first_aid", "Paediatric first aid"],
  ["right_to_work", "ID & right to work"],
  ["reference_1", "Reference 1"],
  ["reference_2", "Reference 2"],
  ["public_liability", "Public liability insurance"],
] as const;