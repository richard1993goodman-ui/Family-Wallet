export type ResourceKind = "activity" | "meal";

export type ActivityIdea = {
  title: string;
  hook: string;
  ageRange: string;
  duration: string;
  setting: string;
  cost: string;
  whatYouNeed: string[];
  steps: string[];
  safetyNote: string;
  whyKidsLoveIt: string;
};

export type MealIdea = {
  title: string;
  hook: string;
  category: string;
  ageRange: string;
  totalTime: string;
  ingredients: string[];
  steps: string[];
  nutritionNote: string;
  safetyNote: string;
  childJob: string;
};

export type ShiftType = "nanny" | "babysitting";

export type ShiftInput = {
  shiftDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isOvernight: boolean;
  hourlyRate: number;
  notes?: string;
  shiftType?: ShiftType;
};

export function rawShiftMinutes(entry: Pick<ShiftInput, "startTime" | "endTime" | "isOvernight">) {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  let duration = toMinutes(entry.endTime) - toMinutes(entry.startTime);
  if (entry.isOvernight || duration < 0) duration += 24 * 60;
  return duration;
}

export function shiftHours(entry: ShiftInput) {
  return Math.max(0, rawShiftMinutes(entry) - Math.max(0, entry.breakMinutes || 0)) / 60;
}

export function shiftAmount(entry: ShiftInput) {
  return shiftHours(entry) * Math.max(0, entry.hourlyRate || 0);
}

export function isBabysitting(entry: Pick<ShiftInput, "shiftType">) {
  return entry.shiftType === "babysitting";
}

export function shiftTotals(entries: ShiftInput[]) {
  return {
    hours: entries.reduce((sum, s) => sum + shiftHours(s), 0),
    amount: entries.reduce((sum, s) => sum + shiftAmount(s), 0),
  };
}
