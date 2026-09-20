export type LeaveType = "holiday" | "sick" | "unpaid" | "other";

export type LeaveInput = {
  nannyId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  notes?: string;
};

export const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "holiday", label: "Holiday" },
  { value: "sick", label: "Sick leave" },
  { value: "unpaid", label: "Unpaid leave" },
  { value: "other", label: "Other" },
];
