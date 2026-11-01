export type ProfileInput = {
  homeAddress?: string;
  importantAddresses?: string;
  houseRules?: string;
  screenTimeRules?: string;
  homeworkExpectations?: string;
  gpDetails?: string;
  medicalNotes?: string;
  emergencyInstructions?: string;
};

export type ChildInput = {
  id?: string;
  name: string;
  dateOfBirth?: string;
  school?: string;
  yearGroup?: string;
  schoolHours?: string;
  allergies?: string;
  dietary?: string;
  medication?: string;
  personality?: string;
  interests?: string;
  dislikes?: string;
  morningRoutine?: string;
  bedtimeRoutine?: string;
  whatMakesThemTick?: string;
};

export const MOODS = ["😊 Great", "🙂 Good", "😐 Ok", "😕 Tricky", "😴 Tired"] as const;
