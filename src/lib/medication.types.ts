export type DoseInput = {
  childName: string;
  medicine: string;
  dose?: string | undefined;
  givenAt: string; // ISO datetime
  nextDoseFrom?: string | undefined;
  reason?: string | undefined;
  notes?: string | undefined;
};

export const COMMON_MEDICINES: { name: string; gapHours: number }[] = [
  { name: "Calpol (paracetamol)", gapHours: 4 },
  { name: "Ibuprofen", gapHours: 6 },
  { name: "Antihistamine (e.g. Piriton)", gapHours: 6 },
  { name: "Antibiotics", gapHours: 8 },
  { name: "Inhaler", gapHours: 4 },
  { name: "Other", gapHours: 4 },
];
