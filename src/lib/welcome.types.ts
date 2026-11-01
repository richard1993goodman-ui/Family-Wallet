export type WelcomeStepId =
  | "agreement"
  | "emergency"
  | "contacts"
  | "children"
  | "planner"
  | "nanny"
  | "dailyLog";

export type WelcomeRoute =
  | "/agreement/$slug"
  | "/emergency/$slug"
  | "/family/$slug"
  | "/planner/$slug"
  | "/nannies/$slug"
  | "/log/$slug";

export type WelcomeStepDef = {
  id: WelcomeStepId;
  label: string;
  description: string;
  href: WelcomeRoute;
};

export const WELCOME_STEPS: WelcomeStepDef[] = [
  {
    id: "agreement",
    label: "Build your nanny agreement",
    description: "Days, hours, pay and duties — signed by you and your nanny.",
    href: "/agreement/$slug",
  },
  {
    id: "emergency",
    label: "Fill in the emergency card",
    description: "Home address, GP and what to do in an emergency.",
    href: "/emergency/$slug",
  },
  {
    id: "contacts",
    label: "Add key contacts",
    description: "Mum, dad, grandparents and anyone your nanny may call.",
    href: "/emergency/$slug",
  },
  {
    id: "children",
    label: "Add your children",
    description: "Routines, allergies, schools and what makes them tick.",
    href: "/family/$slug",
  },
  {
    id: "planner",
    label: "Plan your first week",
    description: "Activities, pickups and anything your nanny needs to know.",
    href: "/planner/$slug",
  },
  {
    id: "nanny",
    label: "Invite your nanny",
    description: "Share their link and sign-in code so they can view and sign.",
    href: "/nannies/$slug",
  },
  {
    id: "dailyLog",
    label: "Try the daily log",
    description: "How each day went — food, mood, homework and tomorrow.",
    href: "/log/$slug",
  },
];

export const FIRST_48_PHASES = [
  { id: "before", label: "Before the first shift" },
  { id: "day1", label: "Day one" },
  { id: "day2", label: "By the end of day two" },
] as const;

export const FIRST_48_STEPS = [
  { id: "expectations", phase: "before", label: "Agree the working arrangement", description: "Confirm start and finish times, duties, pay, breaks and who to contact if running late.", href: "/agreement/$slug" },
  { id: "safety", phase: "before", label: "Talk through allergies and emergencies", description: "Review emergency contacts, allergies, medication instructions and where first-aid supplies are kept.", href: "/emergency/$slug" },
  { id: "pickup", phase: "before", label: "Confirm school collection", description: "Check collection permission, the meeting point, travel arrangements and a backup plan.", href: "/planner/$slug" },
  { id: "home", phase: "day1", label: "Walk through the home together", description: "Cover keys, alarms, pets, safe areas and where food, spare clothes and essentials are kept.", href: "/guide/$slug" },
  { id: "routine", phase: "day1", label: "Agree the after-school routine", description: "Talk through snacks, homework, screen time, dinner and what helps each child settle.", href: "/guide/$slug" },
  { id: "boundaries", phase: "day1", label: "Set communication and privacy boundaries", description: "Agree when to message, photo permissions, visitors and how to raise a concern.", href: "/messages/$slug" },
  { id: "expenses", phase: "day1", label: "Agree spending and reimbursements", description: "Set spending permission for food, travel and activities, receipt expectations and how expenses will be repaid.", href: "/handover/$slug" },
  { id: "handover", phase: "day1", label: "Complete the first handover", description: "Share food, mood, activities, any medication given and anything needed tomorrow.", href: "/handover/$slug" },
  { id: "review", phase: "day2", label: "Have a ten-minute settling-in chat", description: "What went well? What was unclear? Agree one adjustment before the next shift.", href: "/checkin/$slug" },
  { id: "nextshift", phase: "day2", label: "Confirm the next shift together", description: "Check the next pickup, clubs, kit and any changes so nobody is left guessing.", href: "/planner/$slug" },
] as const;

export type First48StepId = (typeof FIRST_48_STEPS)[number]["id"];
export type First48Input = { slug: string; nannyId: string; stepId: First48StepId; confirmed: boolean; note: string };

export function validateFirst48Input(input: First48Input) {
  if (!FIRST_48_STEPS.some((step) => step.id === input.stepId)) throw new Error("Unknown checklist item.");
  if (typeof input.confirmed !== "boolean") throw new Error("Please confirm your choice.");
  if (typeof input.note !== "string" || input.note.length > 2000) throw new Error("Keep notes under 2,000 characters.");
  return { ...input, note: input.note.trim() };
}

export function canConfirmFirst48(access: "family" | "nanny", signedInNannyId: string | null, targetNannyId: string) {
  return access === "family" || (signedInNannyId !== null && signedInNannyId === targetNannyId);
}

export function first48Done(parentConfirmed: string | null, nannyConfirmed: string | null) {
  return Boolean(parentConfirmed && nannyConfirmed);
}
