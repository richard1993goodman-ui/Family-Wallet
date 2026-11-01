export type PassportInput = {
  childName: string;
  activity: string;
  skillArea: string;
  confidenceLevel: number;
  effortLevel: number;
  minutes: number;
  badge?: string | undefined;
  notes?: string | undefined;
  entryDate: string;
};

export type HandoverInput = {
  nannyId?: string | undefined;
  handoverDate: string;
  homeworkStatus?: string | undefined;
  dinnerStatus?: string | undefined;
  waterStatus?: string | undefined;
  mood?: string | undefined;
  energy?: string | undefined;
  schoolBagReady: boolean;
  peKitReady: boolean;
  readingDone: boolean;
  tomorrowNotes?: string | undefined;
  parentNotes?: string | undefined;
};

export type ExpenseInput = {
  nannyId?: string | undefined;
  expenseDate: string;
  item: string;
  amount: number;
  category: string;
  notes?: string | undefined;
};

export const SKILL_AREAS = [
  { value: "football", label: "Football" },
  { value: "tennis", label: "Tennis" },
  { value: "swimming", label: "Swimming" },
  { value: "cycling", label: "Cycling" },
  { value: "fitness", label: "Fitness" },
  { value: "outdoor", label: "Outdoor adventure" },
  { value: "confidence", label: "Confidence" },
  { value: "general", label: "General" },
] as const;

export const BADGES = [
  "First try",
  "Confidence boost",
  "Team player",
  "New skill",
  "Screen-free win",
  "Personal best",
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "transport", label: "Transport" },
  { value: "food", label: "Food/snacks" },
  { value: "activity", label: "Activity" },
  { value: "kit", label: "Kit/supplies" },
  { value: "other", label: "Other" },
] as const;
