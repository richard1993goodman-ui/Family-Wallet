import type { ComponentType } from "react";
import type { Vars } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/en-GB";

/** The translate function from useT(). Passing it makes menus show titles in the chosen language. */
export type Translate = (key: MessageKey, vars?: Vars) => string;
import {
  BedDouble,
  BadgeCheck,
  BookOpen,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Baby,
  Camera,
  ClipboardCheck,
  Clock3,
  Coins,
  FileBarChart,
  FileText,
  Heart,
  Home,
  KeyRound,
  LifeBuoy,
  Landmark,
  Bell,
  ListChecks,
  MessageCircle,
  NotebookPen,
  Pill,
  Plane,
  ShieldAlert,
  FolderLock,
  ShieldCheck,
  Siren,
  UserPlus,
  Users,
} from "lucide-react";

export type WalletRole = "family" | "nanny";

export type WalletPath =
  | "/w/$slug"
  | "/people/$slug"
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
  | "/payroll/$slug"
  | "/training/$slug"
  | "/safety/$slug"
  | "/moments/$slug"
  | "/today/$slug"
  | "/pettycash/$slug"
  | "/livein/$slug"
  | "/messages/$slug"
  | "/housemanual/$slug"
  | "/kids/$slug"
  | "/bankdetails/$slug"
  | "/incidents/$slug"
  | "/permissions/$slug"
  | "/notifications/$slug"
  | "/hours/$slug"
  | "/support/$slug"
  | "/billing/$slug"
  | "/mylogin/$slug"
  | "/documents/$slug";

export type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: WalletPath;
  /** Extra words the command palette should match on. */
  keywords?: string[];
  /** What to show: the label in the chosen language. `label` stays the English identity used for matching. */
  title?: string;
};

export type NavSection = { label: string; items: NavItem[]; title?: string };

const item = (
  label: string,
  icon: NavItem["icon"],
  to: WalletPath,
  keywords?: string[],
): NavItem => (keywords ? { label, icon, to, keywords } : { label, icon, to });

const home = item("Home", Home, "/w/$slug", ["dashboard", "overview"]);
const people = item("People overview", Users, "/people/$slug", ["children", "staff", "nanny", "household"]);
const calendar = item("Calendar", CalendarDays, "/planner/$slug", ["planner", "week", "schedule"]);
const messages = item("Messages", MessageCircle, "/messages/$slug", ["chat", "threads"]);
const dailyLog = item("Daily log", NotebookPen, "/log/$slug", ["update", "mood", "notes"]);
const medication = item("Medication log", Pill, "/medication/$slug", [
  "medicine",
  "dose",
  "calpol",
]);
const incidents = item("Incident reports", ShieldAlert, "/incidents/$slug", [
  "accident",
  "bump",
  "injury",
  "report",
]);
const permissions = item("Permissions", ListChecks, "/permissions/$slug", [
  "consent",
  "sun cream",
  "collect",
  "photos",
]);
const handover = item("Handover & expenses", ClipboardCheck, "/handover/$slug", ["receipts"]);
const today = item("Today", Baby, "/today/$slug", ["nap", "bottle", "nappy", "feed", "meal", "potty"]);
const moments = item("Photo moments", Camera, "/moments/$slug", ["photos", "milestones"]);
const report = item("Weekly report", FileBarChart, "/report/$slug", ["friday", "summary"]);
const emergency = item("Emergency card", Siren, "/emergency/$slug", [
  "gp",
  "contacts",
  "allergies",
]);
const houseManual = item("House manual & codes", KeyRound, "/housemanual/$slug", ["wifi", "alarm"]);
const kids = item("Kids' playbook", Heart, "/kids/$slug", ["comforters", "friends"]);
const children = item("Children & routines", Users, "/family/$slug", ["school", "bedtime"]);
const guide = item("Nanny quick guide", BookOpen, "/guide/$slug", ["summary"]);
const travel = item("Travel pack", Plane, "/travel/$slug", ["holiday", "villa", "abroad"]);
const nannies = item("Household staff", UserPlus, "/nannies/$slug", [
  "invite",
  "code",
  "nanny",
  "au pair",
  "housekeeper",
  "role",
]);
const workHours = item("Working hours", CalendarClock, "/hours/$slug", ["schedule", "rota", "shifts", "days"]);
const agreement = item("Nanny agreement", FileText, "/agreement/$slug", ["contract", "sign"]);
const timesheets = item("Timesheets", Clock3, "/timesheets/$slug", ["hours", "shifts", "pay"]);
const leave = item("Holiday & leave", CalendarCheck, "/leave/$slug", ["time off", "absence"]);
const liveIn = item("Au pair & live-in", BedDouble, "/livein/$slug", ["au pair", "pocket money", "days off", "live in"]);
const pettyCash = item("Petty cash", Coins, "/pettycash/$slug", ["float", "spending"]);
const payroll = item("Payroll setup", Briefcase, "/payroll/$slug", ["nannytax", "payslips"]);
const training = item("Nanny training", BadgeCheck, "/training/$slug", ["quiz", "certificate"]);
const safety = item("Safety records", ShieldCheck, "/safety/$slug", ["dbs", "insurance"]);
const documents = item("Documents", FolderLock, "/documents/$slug", ["dbs", "id", "passport", "right to work", "files", "upload", "visa"]);
const notifications = item("Notifications", Bell, "/notifications/$slug", ["alerts", "push", "unread"]);
const billing = item("Plan & billing", Coins, "/billing/$slug", ["subscription", "upgrade", "invoice", "card", "plan"]);
const myLogin = item("My login", KeyRound, "/mylogin/$slug", ["account", "email", "sign in", "password"]);
const helpSupport = item("Help & support", LifeBuoy, "/support/$slug", ["email", "contact", "question", "help"]);
const bankDetails = item("Bank details", Landmark, "/bankdetails/$slug", [
  "account",
  "sort code",
  "payment",
]);

/** One navigation for everyone: the same five places, with what is inside depending on who is signed in. */
const familyNav: NavSection[] = [
  { label: "Home", items: [home, today, dailyLog, messages, medication, incidents, handover, moments, report] },
  { label: "Calendar", items: [calendar, workHours, timesheets, leave, liveIn] },
  { label: "People", items: [people, children, kids, nannies, permissions, houseManual, emergency, guide, travel] },
  { label: "Wallet", items: [documents, agreement, payroll, bankDetails, pettyCash, training, safety] },
  { label: "More", items: [notifications, billing, myLogin, helpSupport] },
];

const nannyNav: NavSection[] = [
  { label: "Home", items: [home, today, dailyLog, messages, medication, incidents, handover, moments] },
  { label: "Calendar", items: [calendar, workHours, timesheets, leave, liveIn] },
  { label: "People", items: [people, kids, permissions, houseManual, emergency, guide, travel] },
  { label: "Wallet", items: [documents, agreement, bankDetails, pettyCash, training, safety] },
  { label: "More", items: [notifications, myLogin, helpSupport] },
];

/** Each menu section has its own colour, carried through to the page header and the menu. */
export const SECTION_TINTS: Record<string, "sage" | "apricot" | "sky" | "lilac" | "butter" | "rose"> = {
  Home: "sage",
  Calendar: "apricot",
  People: "sky",
  Wallet: "lilac",
  More: "butter",
};
export const sectionTint = (label: string | undefined) => SECTION_TINTS[label ?? ""] ?? "sage";

/** The nav for a role. Households that don't use the nanny agreement don't see its page. */
const SECTION_KEYS: Record<string, MessageKey> = {
  Home: "nav.section.home",
  Calendar: "nav.section.calendar",
  People: "nav.section.people",
  Wallet: "nav.section.wallet",
  More: "nav.section.more",
};

export function navFor(role: WalletRole, agreements = true, noun = "nanny", t?: Translate): NavSection[] {
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  // Labels follow who the household actually employs: "Au pair agreement", "Housekeeper quick guide"...
  const relabel = (label: string) => label.replace(/^Nanny /, `${Noun} `);
  const sections = (role === "nanny" ? nannyNav : familyNav).map((s) => ({
    ...s,
    items: s.items.map((i) => (i.label.startsWith("Nanny ") ? { ...i, label: relabel(i.label) } : i)),
  }));
  // "My login" only appears once accounts are switched on for the build (VITE_ACCOUNTS_ENABLED=true).
  const accounts = import.meta.env["VITE_ACCOUNTS_ENABLED"] === "true";
  const hidden = (to: string) => (!agreements && to === "/agreement/$slug") || (!accounts && to === "/mylogin/$slug");
  return sections.map((s) => ({
    ...s,
    title: t ? t(SECTION_KEYS[s.label] ?? "nav.section.home") : s.label,
    items: s.items
      .filter((i) => !hidden(i.to))
      .map((i) => ({ ...i, title: t ? t(`nav.${routePrefix(i.to)}` as MessageKey, { Noun }) : i.label })),
  }));
}

export type MobileTab = { label: string; icon: NavItem["icon"]; to: WalletPath; title?: string };

/** The four places on the phone bar; "More" is the fifth button and opens every page. A tab is lit when the page is in its section. */
export function mobileTabsFor(role: WalletRole, t?: Translate): MobileTab[] {
  const tabs: MobileTab[] = [
    { label: "Home", icon: Home, to: "/w/$slug" },
    { label: "Calendar", icon: CalendarDays, to: "/planner/$slug" },
    { label: "People", icon: Users, to: "/people/$slug" },
    { label: "Wallet", icon: FolderLock, to: "/documents/$slug" },
  ];
  return tabs.map((tab) => ({ ...tab, title: t ? t(`tab.${tab.label.toLowerCase()}` as MessageKey) : tab.label }));
}

export function routePrefix(to: string) {
  return to.split("/")[1] ?? "";
}

/** The nav section containing this page, if any. */
export function sectionFor(role: WalletRole, prefix: string, agreements = true, noun = "nanny"): NavSection | null {
  return navFor(role, agreements, noun).find((s) => s.items.some((i) => routePrefix(i.to) === prefix)) ?? null;
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
