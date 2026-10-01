export type WelcomeStepId =
  | "agreement"
  | "emergency"
  | "contacts"
  | "children"
  | "planner"
  | "nanny"
  | "dailyLog";

export type WelcomeStepDef = {
  id: WelcomeStepId;
  label: string;
  description: string;
  href: string;
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
