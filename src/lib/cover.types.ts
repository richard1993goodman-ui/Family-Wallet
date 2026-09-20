export type CoverType = "emergency" | "babysitting" | "holiday" | "ongoing";

export type CoverStatus = "new" | "arranged" | "declined" | "cancelled";

export type CoverInput = {
  coverType: CoverType;
  startDate: string;
  endDate?: string | undefined;
  startTime?: string | undefined;
  endTime?: string | undefined;
  children?: string | undefined;
  location?: string | undefined;
  notes?: string | undefined;
};

export const COVER_TYPES: { value: CoverType; label: string; blurb: string }[] = [
  {
    value: "emergency",
    label: "Emergency cover",
    blurb: "Your nanny is off sick or unavailable and you need someone today or tomorrow.",
  },
  {
    value: "babysitting",
    label: "Babysitting",
    blurb: "An evening or weekend sitter from our vetted team.",
  },
  {
    value: "holiday",
    label: "Holiday cover",
    blurb: "Cover while your nanny is on booked leave or during school holidays.",
  },
  {
    value: "ongoing",
    label: "Extra regular help",
    blurb: "An additional day or regular shift added to your week.",
  },
];
