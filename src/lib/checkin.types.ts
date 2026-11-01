export type CheckinKind = "six_month" | "annual" | "custom";

export type CheckinInput = {
  id?: string | undefined;
  kind: CheckinKind;
  nannyId?: string | undefined;
  answers: Record<string, string>;
  complete?: boolean | undefined;
};

export const CHECKIN_KINDS: { value: CheckinKind; label: string; blurb: string }[] = [
  {
    value: "six_month",
    label: "6-month check-in",
    blurb: "A quick halfway conversation about how the role is going.",
  },
  {
    value: "annual",
    label: "1-year review",
    blurb: "A fuller yearly review covering hours, pay and the year ahead.",
  },
  {
    value: "custom",
    label: "Catch-up",
    blurb: "Any other time you want to talk things through properly.",
  },
];

export const CHECKIN_PROMPTS: { key: string; label: string; hint: string }[] = [
  {
    key: "going_well",
    label: "What is going really well?",
    hint: "Routines that work, wins with the children, things to keep doing.",
  },
  {
    key: "tricky",
    label: "What has been tricky?",
    hint: "Handovers, timings, behaviour, communication — anything worth naming early.",
  },
  {
    key: "children",
    label: "How are the children doing?",
    hint: "Confidence, activity levels, homework, friendships, sleep and food.",
  },
  {
    key: "schedule",
    label: "Any schedule changes coming up?",
    hint: "New school year, club changes, term dates, holidays, later finishes.",
  },
  {
    key: "pay",
    label: "Pay, hours and bonus review",
    hint: "Hourly rate, agreed hours, overtime, mileage, any bonus at review time.",
  },
  {
    key: "training",
    label: "Training or support wanted",
    hint: "First aid refresh, safeguarding, coaching qualifications, driving.",
  },
  {
    key: "next",
    label: "Agreed actions for the next few months",
    hint: "Who is doing what, and by when.",
  },
];
