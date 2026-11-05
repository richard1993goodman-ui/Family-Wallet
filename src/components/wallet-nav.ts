import type { ComponentType } from "react";
import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  Calculator,
  CalendarCheck,
  CalendarDays,
  Camera,
  ClipboardCheck,
  Clock3,
  Coins,
  Dumbbell,
  FileBarChart,
  FileText,
  Heart,
  Home,
  KeyRound,
  MessageCircle,
  NotebookPen,
  Pill,
  Plane,
  ShieldCheck,
  Siren,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

export type WalletRole = "family" | "nanny";

export type WalletPath =
  | "/w/$slug"
  | "/planner/$slug"
  | "/log/$slug"
  | "/report/$slug"
  | "/emergency/$slug"
  | "/family/$slug"
  | "/nannies/$slug"
  | "/guide/$slug"
  | "/agreement/$slug"
  | "/timesheets/$slug"
  | "/leave/$slug"
  | "/handover/$slug"
  | "/medication/$slug"
  | "/travel/$slug"
  | "/passport/$slug"
  | "/payroll/$slug"
  | "/costs/$slug"
  | "/training/$slug"
  | "/safety/$slug"
  | "/welcome/$slug"
  | "/moments/$slug"
  | "/pettycash/$slug"
  | "/messages/$slug"
  | "/housemanual/$slug"
  | "/kids/$slug";

export type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: WalletPath;
  /** Extra words the command palette should match on. */
  keywords?: string[];
};

export type NavSection = { label: string; items: NavItem[] };

const item = (
  label: string,
  icon: NavItem["icon"],
  to: WalletPath,
  keywords?: string[],
): NavItem => (keywords ? { label, icon, to, keywords } : { label, icon, to });

const home = item("Home", Home, "/w/$slug", ["dashboard", "overview"]);
const calendar = item("Calendar", CalendarDays, "/planner/$slug", ["planner", "week", "schedule"]);
const messages = item("Messages", MessageCircle, "/messages/$slug", ["chat", "threads"]);
const dailyLog = item("Daily log", NotebookPen, "/log/$slug", ["update", "mood", "notes"]);
const medication = item("Medication log", Pill, "/medication/$slug", [
  "medicine",
  "dose",
  "calpol",
]);
const handover = item("Handover & expenses", ClipboardCheck, "/handover/$slug", ["receipts"]);
const moments = item("Photo moments", Camera, "/moments/$slug", ["photos", "milestones"]);
const report = item("Weekly report", FileBarChart, "/report/$slug", ["friday", "summary"]);
const passport = item("Active Kids Passport", Dumbbell, "/passport/$slug", ["sport", "activities"]);
const emergency = item("Emergency card", Siren, "/emergency/$slug", [
  "gp",
  "contacts",
  "allergies",
]);
const houseManual = item("House manual & codes", KeyRound, "/housemanual/$slug", ["wifi", "alarm"]);
const kids = item("Kids' playbook", Heart, "/kids/$slug", ["comforters", "friends"]);
const children = item("Children & routines", Users, "/family/$slug", ["school", "bedtime"]);
const guide = item("Nanny quick guide", BookOpen, "/guide/$slug", ["summary"]);
const first48 = item("First 48 hours", Sparkles, "/welcome/$slug", ["onboarding", "welcome"]);
const travel = item("Travel pack", Plane, "/travel/$slug", ["holiday", "villa", "abroad"]);
const nannies = item("Your nannies", UserPlus, "/nannies/$slug", ["invite", "code"]);
const agreement = item("Nanny agreement", FileText, "/agreement/$slug", ["contract", "sign"]);
const timesheets = item("Timesheets", Clock3, "/timesheets/$slug", ["hours", "shifts", "pay"]);
const leave = item("Holiday & leave", CalendarCheck, "/leave/$slug", ["time off", "absence"]);
const pettyCash = item("Petty cash", Coins, "/pettycash/$slug", ["float", "spending"]);
const payroll = item("Payroll setup", Briefcase, "/payroll/$slug", ["nannytax", "payslips"]);
const costs = item("Employment costs", Calculator, "/costs/$slug", ["tax", "pension", "ni"]);
const training = item("Nanny training", BadgeCheck, "/training/$slug", ["quiz", "certificate"]);
const safety = item("Safety records", ShieldCheck, "/safety/$slug", ["dbs", "insurance"]);

const familyNav: NavSection[] = [
  { label: "Overview", items: [home, calendar, messages, report] },
  { label: "Day to day", items: [dailyLog, medication, handover, moments, passport] },
  {
    label: "Family & home",
    items: [children, kids, houseManual, emergency, guide, first48, travel],
  },
  {
    label: "Your nanny",
    items: [nannies, agreement, timesheets, leave, pettyCash, payroll, costs, training, safety],
  },
];

const nannyNav: NavSection[] = [
  { label: "My day", items: [home, calendar, messages, dailyLog, medication, handover, moments] },
  {
    label: "The family",
    items: [emergency, houseManual, kids, passport, first48, travel],
  },
  { label: "My work", items: [timesheets, leave, pettyCash, agreement, training, safety] },
];

export function navFor(role: WalletRole): NavSection[] {
  return role === "nanny" ? nannyNav : familyNav;
}

export type MobileTab = { label: string; icon: NavItem["icon"]; to: WalletPath };

export function mobileTabsFor(role: WalletRole): MobileTab[] {
  return role === "nanny"
    ? [
        { label: "Today", icon: Home, to: "/w/$slug" },
        { label: "Log", icon: NotebookPen, to: "/log/$slug" },
        { label: "Messages", icon: MessageCircle, to: "/messages/$slug" },
        { label: "Hours", icon: Clock3, to: "/timesheets/$slug" },
      ]
    : [
        { label: "Home", icon: Home, to: "/w/$slug" },
        { label: "Calendar", icon: CalendarDays, to: "/planner/$slug" },
        { label: "Messages", icon: MessageCircle, to: "/messages/$slug" },
        { label: "Family", icon: Users, to: "/family/$slug" },
      ];
}

export function routePrefix(to: string) {
  return to.split("/")[1] ?? "";
}

/** The nav section containing this page, if any. */
export function sectionFor(role: WalletRole, prefix: string): NavSection | null {
  return navFor(role).find((s) => s.items.some((i) => routePrefix(i.to) === prefix)) ?? null;
}

/**
 * Every route that renders inside the wallet shell. Includes pages that are linked from
 * the home screen rather than the nav.
 */
export const walletPrefixes = new Set([
  ...familyNav.flatMap((s) => s.items.map((i) => routePrefix(i.to))),
  ...nannyNav.flatMap((s) => s.items.map((i) => routePrefix(i.to))),
  "cover",
  "curation",
  "perks",
  "playbooks",
  "support",
  "checkin",
  "terms",
]);
