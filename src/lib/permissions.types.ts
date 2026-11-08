export type PermissionAnswer = "yes" | "no" | "ask_first";
export type PermissionCategory = "health" | "outdoors" | "digital" | "travel" | "collection" | "other";

export const PERMISSION_ANSWERS: { value: PermissionAnswer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "ask_first", label: "Ask me first" },
  { value: "no", label: "No" },
];

export const PERMISSION_CATEGORIES: { value: PermissionCategory; label: string }[] = [
  { value: "health", label: "Health" },
  { value: "outdoors", label: "Outdoors and activities" },
  { value: "digital", label: "Photos and screens" },
  { value: "travel", label: "Getting around" },
  { value: "collection", label: "Who can collect the children" },
  { value: "other", label: "Other" },
];

/** The questions every household is asked. Order here is the order on the page. */
export const PRESET_PERMISSIONS: { key: string; label: string; category: PermissionCategory }[] = [
  { key: "sun_cream", label: "Apply sun cream", category: "health" },
  { key: "medicine", label: "Give Calpol or similar for a temperature", category: "health" },
  { key: "first_aid", label: "Basic first aid and plasters", category: "health" },
  { key: "urgent_treatment", label: "Get urgent medical treatment if I can't be reached", category: "health" },
  { key: "swimming", label: "Swimming and water play", category: "outdoors" },
  { key: "playdates", label: "Playdates at other people's homes", category: "outdoors" },
  { key: "photos_taken", label: "Take photos of the children", category: "digital" },
  { key: "photos_social", label: "Share photos on social media", category: "digital" },
  { key: "screen_extra", label: "Screen time beyond the usual rules", category: "digital" },
  { key: "public_transport", label: "Travel by bus, Tube or train", category: "travel" },
  { key: "nanny_car", label: "Travel in the nanny's own car", category: "travel" },
  { key: "taxi", label: "Travel by taxi or ride share", category: "travel" },
];

export const PRESET_KEYS = PRESET_PERMISSIONS.map((p) => p.key);

export type PermissionInput = {
  key: string;
  label: string;
  category: PermissionCategory;
  answer: PermissionAnswer;
  note?: string | undefined;
  isCustom?: boolean | undefined;
};
