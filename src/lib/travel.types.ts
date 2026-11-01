export type ChecklistItem = { id: string; label: string; done: boolean };
export type TravelNote = {
  id: string;
  category: string;
  text: string;
  authorRole: "family" | "nanny";
  authorName: string;
  createdAt: string;
};
export type TripInput = {
  id?: string | undefined;
  destination: string;
  startDate: string;
  endDate: string;
  accommodation?: string | undefined;
  localEmergency?: string | undefined;
  nearestHospital?: string | undefined;
  timeDifference?: string | undefined;
  travelPay?: string | undefined;
  notes?: string | undefined;
};

export const DEFAULT_TRAVEL_CHECKLIST = [
  "Passports checked (valid 6+ months)",
  "Parental consent letter for the nanny travelling with the children",
  "EHIC/GHIC cards and travel insurance details",
  "Children's medication, Calpol and allergy kit packed",
  "Sun cream, hats and swim kit",
  "Car seats / travel buggy arranged",
  "Nanny's flights, room and days off agreed",
  "Travel pay or daily rate agreed in writing",
  "Pool and beach safety rules agreed",
  "Local emergency number and nearest hospital saved",
  "Chargers, adapters and entertainment for the journey",
  "Copies of passports saved to phone",
];

export const TRAVEL_NOTE_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "pool", label: "Pool & beach" },
  { value: "sleep", label: "Sleep & jet lag" },
  { value: "food", label: "Food & water" },
  { value: "health", label: "Health & sun" },
  { value: "outing", label: "Outings" },
];
