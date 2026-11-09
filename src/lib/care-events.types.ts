export const CARE_KINDS = ["nap", "bottle", "meal", "nappy", "potty"] as const;
export type CareKind = (typeof CARE_KINDS)[number];

export type CareEventInput = {
  kind: CareKind;
  childId?: string | undefined;
  amountMl?: number | undefined;
  detail?: string | undefined;
};

export type CareEventRow = {
  id: string;
  kind: CareKind;
  childId: string | null;
  childName: string | null;
  startedAt: string;
  endedAt: string | null;
  amountMl: number | null;
  detail: string | null;
  addedBy: string;
};

export type CareEventsData = {
  access: "family" | "nanny";
  children: { id: string; name: string }[];
  /** Last 7 days, newest first. */
  events: CareEventRow[];
};

export const CARE_LABELS: Record<CareKind, string> = {
  nap: "Nap",
  bottle: "Bottle",
  meal: "Meal",
  nappy: "Nappy",
  potty: "Potty",
};

export function napMinutes(e: Pick<CareEventRow, "startedAt" | "endedAt">) {
  if (!e.endedAt) return 0;
  return Math.max(0, Math.round((Date.parse(e.endedAt) - Date.parse(e.startedAt)) / 60000));
}

/** Totals for one calendar day (YYYY-MM-DD in the viewer's zone), for the week strip. */
export function dayTotals(events: CareEventRow[], day: string, dayOf: (iso: string) => string) {
  let napMins = 0;
  let bottleMl = 0;
  let nappies = 0;
  for (const e of events) {
    if (dayOf(e.startedAt) !== day) continue;
    if (e.kind === "nap") napMins += napMinutes(e);
    else if (e.kind === "bottle") bottleMl += e.amountMl ?? 0;
    else if (e.kind === "nappy" || e.kind === "potty") nappies += 1;
  }
  return { napMins, bottleMl, nappies };
}
