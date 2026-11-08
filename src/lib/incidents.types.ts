export const INCIDENT_KINDS = [
  { value: "accident", label: "Accident or injury" },
  { value: "near_miss", label: "Near miss" },
  { value: "illness", label: "Illness" },
  { value: "behaviour", label: "Behaviour" },
  { value: "other", label: "Other" },
] as const;

export const INCIDENT_SEVERITIES = [
  { value: "minor", label: "Minor, no treatment needed" },
  { value: "needed_first_aid", label: "First aid given" },
  { value: "needed_medical_help", label: "Medical help needed" },
] as const;

export type IncidentKind = (typeof INCIDENT_KINDS)[number]["value"];
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]["value"];

export type IncidentInput = {
  childName: string;
  occurredAt: string; // ISO datetime
  kind: IncidentKind;
  severity: IncidentSeverity;
  whatHappened: string;
  actionTaken?: string | undefined;
  parentsTold: boolean;
};
