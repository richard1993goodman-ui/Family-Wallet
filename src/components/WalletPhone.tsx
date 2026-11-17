import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand";
import { AFTER_SCHOOL_DAY, DEMO_AVATARS, type Post } from "@/lib/demo-photos";
import {
  UserRound as UserIcon,
  LogOut as LogOutIcon,
  ArrowLeft,
  BadgeCheck,
  BatteryFull,
  Bell,
  BookOpen,
  Briefcase,
  Calculator,
  CalendarCheck,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Coins,
  Dumbbell,
  ExternalLink,
  Eye,
  EyeOff,
  FileChartColumn,
  FileText,
  Heart,
  Home,
  KeyRound,
  Lock,
  Medal,
  Menu,
  MessageCircle,
  NotebookPen,
  Pill,
  Plane,
  Plus,
  ScanFace,
  SendHorizontal,
  ShieldCheck,
  Signal,
  Siren,
  Sparkles,
  StickyNote,
  UserPlus,
  Users,
  Utensils,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * A working copy of Family Wallet for the landing page. Names and details come from the
 * public demo wallet, and nothing here talks to a server.
 */

export type Tab = "home" | "calendar" | "messages" | "family" | "more";
export type Page =
  | "log"
  | "agreement"
  | "thread"
  | "house"
  | "passport"
  | "medicine"
  | "cash"
  | "leave"
  | "moments"
  | "today";
type Msg = { from: "you" | "jess"; text: string; time: string };

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "family", label: "Family", icon: Users },
  { id: "more", label: "More", icon: Menu },
];

// On the server, and until the visitor's own clock takes over: Friday 6 November, 15:42
const FALLBACK = new Date(2026, 10, 6, 17, 45);
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const two = (n: number) => String(n).padStart(2, "0");
const hhmm = (d: Date) => `${two(d.getHours())}:${two(d.getMinutes())}`;
const longDate = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const shortDate = (d: Date) =>
  `${DAYS[d.getDay()]!.slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]!.slice(0, 3)}`;
const monthYear = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const weekday = (d: Date) => (d.getDay() + 6) % 7; // Monday is 0
const weekOf = (d: Date) => Array.from({ length: 7 }, (_, i) => addDays(d, i - weekday(d)));

/** The weekdays Jess last worked, newest first */
function workedDays(today: Date, n: number) {
  const out: Date[] = [];
  for (let d = addDays(today, -1); out.length < n; d = addDays(d, -1)) {
    if (weekday(d) < 5) out.push(d);
  }
  return out;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Turns the phone. Its edges and back only render mid-turn, so at rest it's flat, crisp HTML. */
function spinPhone(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  el.setAttribute("data-spinning", "");
  const anim = el.animate(keyframes, options);
  anim.onfinish = anim.oncancel = () => {
    if (el.getAnimations().length) return; // these events arrive late; a newer spin may be running
    el.removeAttribute("data-spinning");
    el.removeAttribute("data-armed");
  };
  return anim;
}

const SEED: Msg[] = [
  {
    from: "you",
    text: "Swimming moved to Thursday this week — kit is in the hall cupboard.",
    time: "14:04",
  },
  {
    from: "jess",
    text: "Perfect, I'll grab it. Do we need a new pair of goggles? The strap is snapping.",
    time: "15:04",
  },
];

// Drafts the visitor can send, and Jess's answers
const REPLIES = [
  {
    you: "Yes please, new goggles. Take it from petty cash.",
    jess: "Will do. I'll pick some up on the way to school.",
  },
  { you: "Thank you, Jess!", jess: "Any time. Leo can't wait for Thursday." },
];

/** The wallet's state. It lives in the section so the list beside the phone can drive it. */
/**
 * The phone always shows the same moment: a school-day afternoon at 17:45, with Jess on shift. It uses the visitor's
 * date (the most recent weekday) so the calendar looks current, but not their clock, so every part of the demo agrees.
 */
function scene(from: Date) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 17, 45);
  if (d.getDay() === 0) d.setDate(d.getDate() - 2);
  if (d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

/** Everything a visitor adds or changes while using the phone. Nothing leaves the page. */
type Store = {
  logged: { at: string; title: string; sub?: string }[];
  events: { day: number; time: string; title: string }[];
  spent: { what: string; amount: number }[];
  leave: "pending" | "approved" | "declined";
  vitaminAt: string | null;
  locked: boolean;
  checks: Record<string, boolean>;
  /** The weekday picked on the calendar (Monday is 0); null means today. */
  calDay: number | null;
};
const EMPTY_STORE: Store = {
  logged: [],
  events: [],
  spent: [],
  leave: "pending",
  vitaminAt: null,
  locked: false,
  checks: {},
  calDay: null,
};

export function useWalletApp() {
  const [store, setStore] = useState(EMPTY_STORE);
  const [nav, setNav] = useState<{ tab: Tab; stack: Page[] }>({ tab: "home", stack: [] });
  const [leaving, setLeaving] = useState(false);
  const [sheet, setSheet] = useState({ label: "", open: false });
  const [signing, setSigning] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [chat, setChat] = useState(SEED);
  const [reply, setReply] = useState<"idle" | "sent" | "typing">("idle");
  const [now, setNow] = useState<Date | null>(null);
  const leavingRef = useRef(false);
  const timers = useRef<number[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Holds the phone but never spins, so its box is where the phone rests
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 20_000);
    const pending = timers.current;
    return () => {
      window.clearInterval(id);
      pending.forEach(window.clearTimeout);
    };
  }, []);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const go = (tab: Tab, stack: Page[] = []) => {
    leavingRef.current = false;
    setLeaving(false);
    setNav({ tab, stack });
  };
  const popped = () => {
    if (!leavingRef.current) return;
    leavingRef.current = false;
    setLeaving(false);
    setNav((n) => ({ ...n, stack: n.stack.slice(0, -1) }));
  };
  const sent = chat.filter((m) => m.from === "you").length - 1;

  return {
    nav,
    leaving,
    sheet,
    store,
    set: (fn: (s: Store) => Store) => setStore(fn),
    signing,
    signedAt,
    chat,
    reply,
    bodyRef,
    stageRef,
    today: scene(now ?? FALLBACK),
    draft: reply === "idle" ? REPLIES[sent]?.you : undefined,
    tab: (tab: Tab) => go(tab),
    jump: (tab: Tab, page?: Page) => go(tab, page ? [page] : []),
    push: (page: Page) => {
      if (leavingRef.current) return;
      setNav((n) => (n.stack.at(-1) === page ? n : { ...n, stack: [...n.stack, page] }));
    },
    back: () => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      setLeaving(true);
      later(500, popped); // in case the slide-out never reports back
    },
    popped,
    openSheet: (label: string) => setSheet({ label, open: true }),
    closeSheet: () => setSheet((s) => ({ ...s, open: false })),
    sign: () => {
      if (signing || signedAt) return;
      setSigning(true);
      later(reducedMotion() ? 0 : 1000, () => {
        setSigning(false);
        setSignedAt(hhmm(new Date()));
      });
    },
    send: () => {
      const r = REPLIES[sent];
      if (!r || reply !== "idle") return;
      setReply("sent");
      setChat((c) => [...c, { from: "you", text: r.you, time: hhmm(new Date()) }]);
      later(700, () => setReply("typing"));
      later(2300, () => {
        setReply("idle");
        setChat((c) => [...c, { from: "jess", text: r.jess, time: hhmm(new Date()) }]);
      });
    },
    spin: () => {
      const el = bodyRef.current;
      if (!el || el.getAnimations().length || reducedMotion()) return;
      spinPhone(
        el,
        [
          { transform: "rotateY(0deg) scale(1)" },
          { transform: "rotateY(180deg) scale(0.94)", offset: 0.5 },
          { transform: "rotateY(360deg) scale(1)" },
        ],
        { duration: 1300, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
      );
    },
  };
}

export type WalletApp = ReturnType<typeof useWalletApp>;
type ScreenProps = { app: WalletApp };

/* ---------- Shared pieces ---------- */

const press =
  "cursor-pointer transition-[scale,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:cursor-default disabled:active:scale-100";
const rowPress = "cursor-pointer transition-colors duration-150 active:bg-navy/[0.05]";
const card = "rounded-[18px] bg-card p-3.5 shadow-sm";
const btn = cn(
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[11px] px-3 text-[11.5px] font-medium [&_svg]:size-3.5",
  press,
);
const btnPrimary = cn(btn, "bg-navy text-primary-foreground disabled:opacity-40");
const btnOutline = cn(btn, "border border-border bg-card text-navy");
const titleCls =
  "font-display text-[23px] font-semibold leading-[1.15] tracking-[-0.015em] text-navy outline-none";

const TINTS = {
  apricot: "bg-[#fde8d7] text-[#8e4a1f]",
  sage: "bg-[#e4efe7] text-[#2f6b4a]",
  rose: "bg-[#f9e3e3] text-[#8f3a43]",
  butter: "bg-[#fbf0cf] text-[#76591a]",
  sky: "bg-[#e1edf7] text-[#2c5a80]",
} as const;

function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div>
      <h3 data-title tabIndex={-1} className={titleCls}>
        {children}
      </h3>
      {sub && <p className="mt-1.5 text-[11.5px] leading-[1.5] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const Label = ({ children }: { children: ReactNode }) => (
  <p className="mt-2 text-[11.5px] font-semibold text-navy">{children}</p>
);

const List = ({ children }: { children: ReactNode }) => (
  <div className="divide-y divide-border overflow-hidden rounded-[18px] bg-card shadow-sm">
    {children}
  </div>
);

function Row({
  icon: Icon,
  title,
  sub,
  tint = "apricot",
  attention,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  sub?: string;
  tint?: keyof typeof TINTS;
  attention?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center gap-3 px-3.5 py-2.5 text-left", rowPress)}
    >
      <span
        className={cn(
          "relative grid size-8 shrink-0 place-items-center rounded-[10px]",
          TINTS[tint],
        )}
      >
        <Icon className="size-[15px]" aria-hidden />
        {attention && (
          <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-card bg-energy" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-medium leading-snug text-navy">{title}</span>
        {sub && (
          <span className="mt-0.5 block text-[10.5px] leading-snug text-muted-foreground">
            {sub}
          </span>
        )}
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
    </button>
  );
}

function BackLink({ app }: ScreenProps) {
  const tab = app.nav.tab;
  const label =
    tab === "messages"
      ? "All conversations"
      : tab === "more"
        ? "Your wallet"
        : TABS.find((t) => t.id === tab)?.label;
  return (
    <button
      type="button"
      onClick={app.back}
      className={cn(
        "-ml-1 inline-flex items-center gap-1 self-start rounded-lg px-1 py-1 text-[11.5px] font-medium text-navy",
        press,
      )}
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

function WeekStrip({
  today,
  selected,
  onSelect,
}: {
  today: Date;
  selected?: number;
  onSelect?: (i: number) => void;
}) {
  return (
    <span className="mt-3 grid grid-cols-7">
      {weekOf(today).map((d, i) => {
        const cell = (
          <>
            <span className="text-[9.5px] text-muted-foreground">
              {DAYS[d.getDay()]!.slice(0, 3)}
            </span>
            <span
              className={cn(
                "grid size-[22px] place-items-center rounded-full text-[11.5px] tabular-nums",
                i === weekday(today) ? "bg-energy-ink text-white" : "text-navy",
              )}
            >
              {d.getDate()}
            </span>
            <span className="relative h-7 w-[5px] rounded-full bg-navy/[0.07]">
              {i < 5 && (
                <span className="absolute inset-x-0 top-[57%] h-[32%] rounded-full bg-energy-ink" />
              )}
            </span>
            <span className="h-[22px] text-center text-[8.5px] leading-[1.3] tabular-nums text-muted-foreground">
              {i < 5 ? (
                <>
                  15:00
                  <br />
                  19:30
                </>
              ) : (
                "Off"
              )}
            </span>
          </>
        );
        const cls = cn(
          "flex flex-col items-center gap-1 rounded-[12px] py-1.5",
          selected === i && "bg-paper",
        );
        return onSelect ? (
          <button
            key={i}
            type="button"
            aria-pressed={selected === i}
            aria-label={longDate(d)}
            onClick={() => onSelect(i)}
            className={cn(cls, press)}
          >
            {cell}
          </button>
        ) : (
          <span key={i} className={cls}>
            {cell}
          </span>
        );
      })}
    </span>
  );
}

/* ---------- Tabs ---------- */

/** Notes the parents left for Jess, by weekday (Monday is 0). */
const PARENT_NOTES: Record<number, string> = {
  0: "Spellings test on Friday. The list is on the fridge",
  3: "Swimming at 16:30. Leo's kit is in the hall cupboard",
  4: "Film night. Popcorn is in the top cupboard",
};
const SHIFT_HOURS = 4.5;

/** The home screen's month: Jess works weekdays 15:00 to 19:30, and every past shift has hours and an update. */
function MonthCard({ app }: ScreenProps) {
  const today = app.today;
  const [picked, setPicked] = useState<number | null>(null);
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const count = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: count }, (_, i) => addDays(first, i));
  const day = days[(picked ?? today.getDate()) - 1]!;
  const isToday = day.getDate() === today.getDate();
  const works = weekday(day) < 5;
  const logged = works && day.getDate() < today.getDate();
  const log = LOGS[day.getDate() % LOGS.length]!;
  const note = PARENT_NOTES[weekday(day)];
  const weekStart = day.getDate() - weekday(day);
  const week = days.filter((d) => d.getDate() >= weekStart && d.getDate() < weekStart + 7);
  const scope = view === "month" ? days : view === "week" ? week : [day];
  const sWorking = scope.filter((d) => weekday(d) < 5);
  const sWorked = sWorking.filter((d) => d.getDate() < today.getDate());
  const stats = [
    [
      "Hours logged",
      String(sWorked.length * SHIFT_HOURS),
      `of ${sWorking.length * SHIFT_HOURS} agreed`,
    ],
    ["Updates", String(sWorked.length), "from Jess"],
    ["Notes", String(scope.filter((d) => PARENT_NOTES[weekday(d)]).length), "from you"],
  ];
  return (
    <>
      <div className={card}>
        <div
          className="mb-2 inline-flex rounded-full bg-navy/[0.06] p-0.5"
          role="tablist"
          aria-label="Calendar view"
        >
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "h-6 rounded-full px-2.5 text-[10px] font-medium capitalize",
                view === v ? "bg-white text-navy shadow-sm" : "text-muted-foreground",
                press,
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="font-display text-[16px] text-navy">
          {view === "month"
            ? monthYear(today)
            : view === "week"
              ? `Week of ${shortDate(weekOf(day)[0]!)}`
              : longDate(day)}
        </p>
        <dl className="mt-2 grid grid-cols-[1.4fr_1fr_1fr] gap-2">
          {stats.map(([label, value, sub]) => (
            <div key={label}>
              <dt className="text-[9.5px] text-muted-foreground">{label}</dt>
              <dd className="font-display text-[19px] leading-tight tabular-nums text-navy">
                {value}
                <span className="block font-sans text-[9px] text-muted-foreground">{sub}</span>
              </dd>
            </div>
          ))}
        </dl>
        {view !== "day" && (
          <div className="mt-3 grid grid-cols-7 gap-y-0.5 border-t border-border pt-2.5">
            {["M", "T", "W", "T", "F", "S", "S"].map((letter, i) => (
              <span
                key={i}
                className="pb-1 text-center text-[9px] text-muted-foreground"
                aria-hidden
              >
                {letter}
              </span>
            ))}
            {(view === "week" ? week : days).map((d) => {
              const past = d.getDate() < today.getDate();
              const on = weekday(d) < 5;
              return (
                <button
                  key={d.getDate()}
                  type="button"
                  aria-pressed={d === day}
                  aria-label={longDate(d)}
                  onClick={() => setPicked(d.getDate())}
                  style={
                    d.getDate() === 1 || (view === "week" && d === week[0])
                      ? { gridColumnStart: weekday(d) + 1 }
                      : undefined
                  }
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-[10px] py-1",
                    d === day && "bg-paper",
                    press,
                  )}
                >
                  <span
                    className={cn(
                      "grid size-[20px] place-items-center rounded-full text-[10.5px] tabular-nums",
                      d.getDate() === today.getDate() ? "bg-energy-ink text-white" : "text-navy",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <span
                    className={cn(
                      "h-2.5 w-1 rounded-full",
                      !on ? "bg-transparent" : past ? "bg-energy-ink" : "bg-energy-ink/25",
                    )}
                  />
                  <span className="flex h-1 gap-px">
                    {on && past && <span className="size-1 rounded-full bg-[#2c5a80]" />}
                    {PARENT_NOTES[weekday(d)] && (
                      <span className="size-1 rounded-full bg-[#8e4a1f]" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Label>{isToday ? "Today" : longDate(day)}</Label>
      <List>
        <Row
          icon={Clock3}
          tint="sage"
          title={works ? "15:00 to 19:30" : "Day off"}
          sub={
            works
              ? `${SHIFT_HOURS} hours ${logged ? "logged and approved" : "agreed"}`
              : "No nanny hours"
          }
          onClick={() => app.tab("calendar")}
        />
        <Row
          icon={NotebookPen}
          tint="sky"
          title={logged ? log.mood : "No update yet"}
          sub={logged ? log.notes[0]![1]! : "Jess writes one at the end of each shift"}
          onClick={() => app.push("log")}
        />
        <Row
          icon={StickyNote}
          title={note ? "Your note" : "No notes for this day"}
          sub={note ?? "Add one from the calendar"}
          onClick={() => app.tab("calendar")}
        />
      </List>
    </>
  );
}

const PHONE_ALERTS = [
  { id: 1, text: "Jess added 3 photos from the park", sub: "Photos · 12 min ago", to: "moments" },
  { id: 2, text: "Leo's swimming kit: new message", sub: "Messages · 3 hr ago", to: "thread" },
  { id: 3, text: "Jess asked for 2 days off in December", sub: "Leave · 1 d ago", to: "leave" },
] as const;

function PhoneBell({ app }: ScreenProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<(typeof PHONE_ALERTS)[number][]>([...PHONE_ALERTS]);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={items.length ? `Notifications, ${items.length} unread` : "Notifications"}
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-navy"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {items.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-semibold text-primary-foreground">
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <p className="border-b border-border px-3 py-2 text-[11px] font-semibold text-foreground">
            Notifications
          </p>
          {items.length === 0 ? (
            <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">
              You're all caught up.
            </p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-2 border-b border-border px-3 py-2 last:border-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setItems((l) => l.filter((x) => x.id !== n.id));
                    app.push(n.to);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block text-[11px] leading-snug text-foreground">{n.text}</span>
                  <span className="block text-[9px] text-muted-foreground">{n.sub}</span>
                </button>
                <button
                  type="button"
                  aria-label="Mark as read"
                  onClick={() => setItems((l) => l.filter((x) => x.id !== n.id))}
                  className="flex h-5 w-5 flex-none items-center justify-center rounded-full border border-border text-muted-foreground"
                >
                  <Check className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PhoneMenu({
  label,
  icon,
  title,
  items,
  onPick,
}: {
  label: string;
  icon: ReactNode;
  title: string;
  items: string[];
  onPick: (item: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-navy"
      >
        {icon}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <p className="border-b border-border px-3 py-2 text-[11px] font-semibold text-foreground">
            {title}
          </p>
          {items.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setOpen(false);
                onPick(item);
              }}
              className={cn(
                "flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-[11px] last:border-0",
                item === "Lock & log out" ? "text-destructive" : "text-foreground",
              )}
            >
              {item === "Lock & log out" && <LogOutIcon className="h-3 w-3" aria-hidden />}
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const SHIFT_START = 15 * 60;
const SHIFT_END = 19 * 60 + 30;
const dur = (m: number) => `${Math.floor(m / 60)}h ${two(m % 60)}m`;

/** Header: a greeting and the date (the bar above already names the family), with SOS one tap away. */
function PhoneHeader({ app }: ScreenProps) {
  const h = app.today.getHours();
  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-[10.5px] text-muted-foreground">{longDate(app.today)}</p>
        <button
          type="button"
          onClick={() => app.openSheet("Emergency contacts")}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-full bg-[#fdecea] px-2.5 text-[10.5px] font-semibold text-[#b3261e]",
            press,
          )}
        >
          <Siren className="size-3.5" aria-hidden />
          SOS
        </button>
        <PhoneBell app={app} />
        <PhoneMenu
          label="Account and log out"
          icon={<UserIcon className="h-4 w-4" aria-hidden />}
          title="The Harrington Family"
          items={["Emergency contacts", "Health & medicine", "Lock & log out"]}
          onPick={(i) =>
            i === "Lock & log out"
              ? app.set((st) => ({ ...st, locked: true }))
              : i === "Health & medicine"
                ? app.push("medicine")
                : app.openSheet(i)
          }
        />
      </div>
      <h3 data-title tabIndex={-1} className={cn(titleCls, "mt-1 text-[22px]")}>
        {h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}
      </h3>
    </div>
  );
}

/** The week as a strip: today is the dark pill; a dot marks Jess's working days. */
function WeekCard({ app }: ScreenProps) {
  const today = app.today;
  return (
    <button
      type="button"
      onClick={() => app.tab("calendar")}
      className={cn(card, "block w-full text-left", press)}
    >
      <span className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-navy">
          <CalendarDays className="size-3.5" aria-hidden />
          This week
        </span>
        <span className="text-[10px] text-muted-foreground">{monthYear(today)}</span>
      </span>
      <span className="mt-2.5 grid grid-cols-7 gap-1">
        {weekOf(today).map((d, i) => {
          const isToday = i === weekday(today);
          return (
            <span
              key={i}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-[12px] py-1.5",
                isToday ? "bg-navy text-white" : "text-navy",
              )}
            >
              <span
                className={cn(
                  "text-[8.5px] font-medium",
                  isToday ? "text-white/75" : "text-muted-foreground",
                )}
              >
                {DAYS[d.getDay()]!.slice(0, 1)}
              </span>
              <span className="text-[12px] font-semibold tabular-nums">{d.getDate()}</span>
              <span
                className={cn(
                  "size-1 rounded-full",
                  i < 5 ? (isToday ? "bg-[#f3c969]" : "bg-[#2f6b4a]") : "bg-transparent",
                )}
              />
            </span>
          );
        })}
      </span>
    </button>
  );
}

/** Now: who is on duty, and how far through the shift they are. Weekends have no shift. */
function ShiftCard({ today }: { today: Date }) {
  const day = today.getDay();
  if (day === 0 || day === 6) return null;
  const mins = today.getHours() * 60 + today.getMinutes();
  const total = SHIFT_END - SHIFT_START;
  const elapsed = Math.min(total, Math.max(0, mins - SHIFT_START));
  const pct = Math.round((elapsed / total) * 100);
  const live = mins >= SHIFT_START && mins < SHIFT_END;
  return (
    <div className={card}>
      <div className="flex items-center gap-2.5">
        <span className="relative shrink-0">
          <img src={DEMO_AVATARS["jess"]} alt="" className="size-10 rounded-full object-cover" />
          {live && (
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-[#2f9e5b]" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-navy">Jess</span>
            <span className="rounded-full bg-[#e4efe7] px-1.5 py-px text-[9px] font-semibold text-[#2f6b4a]">
              Nanny
            </span>
          </span>
          <span className="block text-[10.5px] text-muted-foreground">
            Shift 15:00 – 19:30 ·{" "}
            {live
              ? `${dur(total - elapsed)} left`
              : mins < SHIFT_START
                ? "starts this afternoon"
                : "finished"}
          </span>
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-[12px] bg-paper px-2.5 py-2 text-[10.5px]">
        <span className="text-muted-foreground">
          Elapsed <span className="font-semibold tabular-nums text-navy">{dur(elapsed)}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e4efe7] px-2 py-0.5 font-semibold tabular-nums text-[#2f6b4a]">
          <span className="size-1.5 rounded-full bg-[#2f9e5b]" aria-hidden />
          {dur(total - elapsed)} remaining
        </span>
      </div>
      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Shift ${pct}% done`}
      >
        <div className="h-full rounded-full bg-[#2f9e5b]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] tabular-nums text-muted-foreground">
        <span>15:00 start</span>
        <span className="font-semibold text-navy">{pct}% done</span>
        <span>19:30 finish</span>
      </div>
    </div>
  );
}

const QUICK_LOG: {
  label: string;
  icon: LucideIcon;
  tint: keyof typeof TINTS;
  go: (app: WalletApp) => void;
}[] = [
  { label: "Note", icon: StickyNote, tint: "butter", go: (a) => a.openSheet("Add a note") },
  { label: "Med", icon: Pill, tint: "rose", go: (a) => a.push("medicine") },
  { label: "Meal", icon: Utensils, tint: "sage", go: (a) => a.openSheet("Log a meal") },
  { label: "Activity", icon: Sparkles, tint: "sky", go: (a) => a.openSheet("Log an activity") },
  { label: "Photo", icon: Camera, tint: "apricot", go: (a) => a.push("moments") },
];

/** One tap to log the usual things, so a busy afternoon still gets written down. */
function QuickLog({ app }: ScreenProps) {
  return (
    <div className={card}>
      <p className="flex items-center justify-between text-[9.5px] font-semibold uppercase tracking-wider text-navy-mid">
        Quick routine log
        <span className="font-normal normal-case tracking-normal text-muted-foreground">
          One tap
        </span>
      </p>
      <div className="mt-2.5 grid grid-cols-5 gap-1.5">
        {QUICK_LOG.map(({ label, icon: Icon, tint, go }) => (
          <button
            key={label}
            type="button"
            onClick={() => go(app)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-[12px] py-2.5 text-[9.5px] font-semibold",
              TINTS[tint],
              press,
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Home, ordered by urgency: who and what (header), what is happening now (shift),
 * what to do in one tap (quick log), how the day is going (timeline), what needs you,
 * then the week and the latest photo for reference.
 */
function HomeScreen({ app }: ScreenProps) {
  const mins = app.today.getHours() * 60 + app.today.getMinutes();
  const live = app.today.getDay() % 6 !== 0 && mins >= SHIFT_START && mins < SHIFT_END;
  return (
    <>
      <PhoneHeader app={app} />
      <ShiftCard today={app.today} />
      <div className="mt-1 flex items-center gap-2">
        <p className="text-[14px] font-semibold text-navy">Today with Jess</p>
        {live && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e4efe7] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#2f6b4a]">
            <span className="size-1.5 rounded-full bg-[#2f9e5b]" aria-hidden />
            Live · {hhmm(app.today)}
          </span>
        )}
      </div>
      <QuickLog app={app} />
      <TodayCard app={app} />

      <Label>{app.signedAt ? "Your agreement" : "Needs your attention"}</Label>
      <List>
        {app.signedAt ? (
          <Row
            icon={Check}
            tint="sage"
            title="Agreement signed"
            sub={`By you and Jess, today at ${app.signedAt}`}
            onClick={() => app.push("agreement")}
          />
        ) : (
          <Row
            icon={FileText}
            title="Finish your nanny agreement"
            sub="Ready to sign: parent and nanny"
            attention
            onClick={() => app.push("agreement")}
          />
        )}
      </List>

      <WeekCard app={app} />
      <LatestPhoto app={app} />
      <div className="flex gap-2">
        <button type="button" onClick={() => app.openSheet("Weekly report")} className={btnOutline}>
          <FileChartColumn aria-hidden />
          Weekly report
        </button>
        <button
          type="button"
          onClick={() => app.push("thread")}
          className={cn(btnPrimary, "flex-1")}
        >
          <MessageCircle aria-hidden />
          Message Jess
        </button>
      </div>
    </>
  );
}

function plansFor(day: number) {
  if (day > 4) return [];
  return [
    { time: "15:00", title: "Jess Carter", sub: "Agreed hours, 15:00 to 19:30" },
    { time: "15:15", title: "School pick-up", sub: "Oscar and Leo, St Mary's Primary" },
    ...(day === 3
      ? [{ time: "16:30", title: "Swimming", sub: "Leo's kit is in the hall cupboard" }]
      : []),
    ...(day === 4 ? [{ time: "18:00", title: "Film night", sub: "Fridays are film night" }] : []),
  ];
}

function CalendarScreen({ app }: ScreenProps) {
  const days = weekOf(app.today);
  const today = weekday(app.today);
  const day = app.store.calDay ?? today;
  const setDay = (i: number) => app.set((st) => ({ ...st, calDay: i }));
  const plans = [
    ...plansFor(day),
    ...app.store.events
      .filter((e) => e.day === day)
      .map((e) => ({ time: e.time, title: e.title, sub: "Added by you" })),
  ].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <>
      <Title sub="Tap a day to see what's on.">Calendar</Title>
      <div className={card}>
        <p className="font-display text-[16px] text-navy">{monthYear(days[day]!)}</p>
        <WeekStrip today={app.today} selected={day} onSelect={setDay} />
      </div>
      <Label>{day === today ? "Today" : longDate(days[day]!)}</Label>
      {plans.length ? (
        <List>
          {plans.map((p, i) => (
            <div key={i} className="flex gap-3 px-3.5 py-2.5">
              <span className="w-9 shrink-0 pt-px text-[10.5px] tabular-nums text-muted-foreground">
                {p.time}
              </span>
              <span>
                <span className="block text-[12px] font-medium text-navy">{p.title}</span>
                <span className="block text-[10.5px] text-muted-foreground">{p.sub}</span>
              </span>
            </div>
          ))}
        </List>
      ) : (
        <p className={cn(card, "text-[11.5px] text-muted-foreground")}>
          No nanny hours. Nothing planned yet.
        </p>
      )}
      {/* Hours, updates and notes moved here from Home, which now leads with the live shift. */}
      <Label>Hours and updates</Label>
      <MonthCard app={app} />
      <BottomBar>
        <button
          type="button"
          onClick={() => app.openSheet("Add an event")}
          className={cn(btnPrimary, "h-10 w-full")}
        >
          <Plus aria-hidden />
          Add to {day === today ? "today" : DAYS[days[day]!.getDay()]}
        </button>
      </BottomBar>
    </>
  );
}

const TOPICS = ["All", "General", "Children", "School & homework", "Meals", "Health"];

function MessagesScreen({ app }: ScreenProps) {
  const [topic, setTopic] = useState("All");
  const last = app.chat[app.chat.length - 1]!;
  return (
    <>
      <Title sub="Private conversations with your nanny, one thread per topic, so nothing gets lost in a busy group chat.">
        Messages
      </Title>
      <div className="flex flex-wrap gap-1.5">
        {TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={topic === t}
            onClick={() => setTopic(t)}
            className={cn(
              "h-7 rounded-full px-2.5 text-[10.5px]",
              topic === t ? "bg-navy text-primary-foreground" : "bg-paper text-navy",
              press,
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {topic === "All" || topic === "Children" ? (
        <List>
          <button
            type="button"
            onClick={() => app.push("thread")}
            className={cn("flex w-full items-center gap-3 px-3.5 py-3 text-left", rowPress)}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-medium text-navy">Leo's swimming kit</span>
              <span className="block truncate text-[10.5px] text-muted-foreground">
                Children · {last.text}
              </span>
            </span>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {last.time}
            </span>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
          </button>
        </List>
      ) : (
        <p className="py-8 text-center text-[11.5px] text-muted-foreground">
          Nothing in {topic} yet.
        </p>
      )}
    </>
  );
}

const CHILDREN = [
  { name: "Oscar", photo: DEMO_AVATARS["oscar"]!, school: "Year 4 · St Mary's Primary" },
  {
    name: "Leo",
    photo: DEMO_AVATARS["leo"]!,
    school: "Reception · St Mary's Primary",
    allergy: "Mild nut allergy · Piriton in the kitchen drawer",
  },
];

function FamilyScreen({ app }: ScreenProps) {
  return (
    <>
      <Title sub="Fill this in once. Your nanny gets a simple quick guide from everything you add here.">
        Know my family
      </Title>
      <Label>Your children</Label>
      {CHILDREN.map((c) => (
        <div key={c.name} className={cn(card, "flex gap-3")}>
          <img
            src={c.photo}
            alt={c.name}
            className="size-9 shrink-0 rounded-full bg-[#fde8d7] object-cover"
            loading="lazy"
          />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-navy">{c.name}</p>
            <p className="text-[10.5px] text-muted-foreground">{c.school}</p>
            {c.allergy ? (
              <p className="mt-1.5 inline-flex rounded-full bg-[#f9e3e3] px-2 py-0.5 text-[10px] text-[#8f3a43]">
                {c.allergy}
              </p>
            ) : (
              <p className="mt-1 text-[10.5px] text-muted-foreground">Allergies: none</p>
            )}
          </div>
        </div>
      ))}
      <Label>Around the house</Label>
      <List>
        <Row
          icon={KeyRound}
          title="House manual & codes"
          sub="WiFi, alarm, key safe and the house rules"
          onClick={() => app.push("house")}
        />
        <Row
          icon={Siren}
          tint="rose"
          title="Emergency card"
          sub="Contacts, allergies, medication, GP and address"
          onClick={() => app.openSheet("Emergency card")}
        />
        <Row
          icon={Heart}
          title="Kids' playbook"
          sub="Comforts, big moments and rainy-day ideas"
          onClick={() => app.openSheet("Kids' playbook")}
        />
        <Row
          icon={BookOpen}
          title="Nanny quick guide"
          sub="A one-page summary for your nanny"
          onClick={() => app.openSheet("Nanny quick guide")}
        />
      </List>
    </>
  );
}

// Every page of the real wallet. The ones without a target open the full demo.
const MORE: { label: string; items: [string, LucideIcon, (Tab | Page)?][] }[] = [
  {
    label: "Day to day",
    items: [
      ["Today", Clock3, "today"],
      ["Daily log", NotebookPen, "log"],
      ["Medication log", Pill, "medicine"],
      ["Handover & expenses", ClipboardCheck, "cash"],
      ["Weekly report", FileChartColumn],
      ["Photo moments", Camera, "moments"],
      ["Active Kids Passport", Dumbbell, "passport"],
    ],
  },
  {
    label: "Family and home",
    items: [
      ["Children & routines", Users, "family"],
      ["Kids' playbook", Heart],
      ["House manual & codes", KeyRound, "house"],
      ["Emergency card", Siren],
      ["Nanny quick guide", BookOpen],
      ["First 48 hours", Sparkles],
      ["Travel pack", Plane],
    ],
  },
  {
    label: "Your nanny",
    items: [
      ["Your nannies", UserPlus],
      ["Nanny agreement", FileText, "agreement"],
      ["Timesheets", Clock3],
      ["Holiday & leave", CalendarCheck, "leave"],
      ["Petty cash", Coins, "cash"],
      ["Payroll setup", Briefcase],
      ["Employment costs", Calculator],
      ["Nanny training", BadgeCheck],
      ["Safety records", ShieldCheck],
    ],
  },
];

const isTab = (id: Tab | Page): id is Tab => TABS.some((t) => t.id === id);

function MoreScreen({ app }: ScreenProps) {
  return (
    <>
      <Title sub="Everything else, by section.">Your wallet</Title>
      {MORE.map((s) => (
        <div key={s.label} className="space-y-2">
          <Label>{s.label}</Label>
          <List>
            {s.items.map(([label, icon, to]) => (
              <Row
                key={label}
                icon={icon}
                title={label}
                onClick={() =>
                  to ? (isTab(to) ? app.tab(to) : app.push(to)) : app.openSheet(label)
                }
              />
            ))}
          </List>
        </div>
      ))}
    </>
  );
}

/** Jess is online during her shift: weekdays 15:00 to 19:30. */
function jessOnline(today: Date) {
  const day = today.getDay();
  const mins = today.getHours() * 60 + today.getMinutes();
  return day !== 0 && day !== 6 && mins >= 15 * 60 && mins < 19 * 60 + 30;
}

/** Headshots of the parent and nanny; a red dot shows who is in the app right now. */
function HeaderAvatars({ today }: { today: Date }) {
  const people = [
    { name: "Emma", initial: "E", photo: DEMO_AVATARS["emma"]!, online: false },
    { name: "Jess", initial: "J", photo: DEMO_AVATARS["jess"]!, online: jessOnline(today) },
  ];
  return (
    <div className="flex items-center -space-x-1.5">
      {people.map((p) => (
        <span
          key={p.name}
          title={p.online ? `${p.name} is online` : p.name}
          className="relative grid size-6 place-items-center rounded-full bg-accent text-[10px] font-semibold text-navy ring-2 ring-background"
        >
          <img
            src={p.photo}
            alt={p.name}
            className="size-full rounded-full object-cover"
            loading="lazy"
          />
          {p.online && (
            <span
              role="img"
              aria-label={`${p.name} is online`}
              className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-red-500 ring-2 ring-background"
            />
          )}
        </span>
      ))}
    </div>
  );
}

/* ---------- Pages ---------- */

const LOGS = [
  {
    mood: "Great — lots of laughs",
    notes: [
      ["What we did", "Scooter race in the park, then Lego build-off"],
      ["What we ate", "Chicken wraps, fruit salad"],
      ["Homework", "Oscar spellings done, Leo read 2 books"],
      ["Noteworthy", "Leo was brave at the dentist this morning!"],
      ["Tomorrow", "PE kit for Oscar"],
    ],
  },
  {
    mood: "Tired but happy",
    notes: [
      ["What we did", "Football drills and den building"],
      ["What we ate", "Fish pie, peas"],
      ["Homework", "Maths sheet done"],
      ["Tomorrow", "Library books back"],
    ],
  },
];

function LogScreen({ app }: ScreenProps) {
  const days = workedDays(app.today, LOGS.length);
  return (
    <>
      <BackLink app={app} />
      <Title sub="A quick note from Jess at the end of each shift.">Daily log</Title>
      {LOGS.map((l, i) => (
        <div key={l.mood} className={card}>
          <p className="font-display text-[16px] text-navy">{longDate(days[i]!)}</p>
          <p className="mt-0.5 text-[12px] text-navy">{l.mood}</p>
          <dl className="mt-2.5 space-y-1.5">
            {l.notes.map(([k, v]) => (
              <div key={k} className="text-[11.5px] leading-[1.45]">
                <dt className="inline font-semibold text-navy">{k}: </dt>
                <dd className="inline text-navy/80">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2.5 text-[9.5px] text-muted-foreground">From Jess Carter</p>
        </div>
      ))}
    </>
  );
}

function Bubble({ m, fresh }: { m: Msg; fresh: boolean }) {
  const you = m.from === "you";
  return (
    <div
      className={cn(
        "max-w-[82%] rounded-[16px] px-3 py-2",
        you
          ? "origin-bottom-right self-end rounded-br-[6px] bg-navy text-primary-foreground"
          : "origin-bottom-left self-start rounded-bl-[6px] border border-border bg-card text-navy",
        fresh && "wp-bubble",
      )}
    >
      <p className="text-[11.5px] leading-[1.45]">{m.text}</p>
      <p
        className={cn(
          "mt-1 text-[9px] tabular-nums",
          you ? "text-primary-foreground/60" : "text-muted-foreground",
        )}
      >
        {you ? "You" : "Jess"} · {m.time}
      </p>
    </div>
  );
}

function ThreadScreen({ app }: ScreenProps) {
  const end = useRef<HTMLDivElement>(null);
  // Keep the newest message in view without moving the page around the phone
  useEffect(() => {
    const scroller = end.current?.closest(".wp-layer");
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }, [app.chat.length, app.reply]);

  return (
    <>
      <BackLink app={app} />
      <Title sub="Children">Leo's swimming kit</Title>
      <div className="flex flex-col gap-2.5" aria-live="polite">
        <p className="text-center text-[10px] text-muted-foreground">Yesterday</p>
        {app.chat.map((m, i) => (
          <div key={i} className="contents">
            {i === SEED.length && (
              <p className="text-center text-[10px] text-muted-foreground">Today</p>
            )}
            <Bubble m={m} fresh={i >= SEED.length} />
          </div>
        ))}
        {app.reply === "typing" && (
          <div
            role="status"
            aria-label="Jess is typing"
            className="wp-bubble flex origin-bottom-left gap-1 self-start rounded-[16px] rounded-bl-[6px] border border-border bg-card px-3 py-3"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="wp-dot size-1.5 rounded-full bg-navy/50"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>
      <div ref={end} />
      <div className="sticky bottom-0 -mx-4 -mb-6 mt-auto border-t border-border bg-background/90 px-3 pb-3 pt-2.5 backdrop-blur">
        <div className="flex items-end gap-2">
          <p
            className={cn(
              "min-h-9 flex-1 rounded-[14px] border border-border bg-card px-3 py-2 text-[11.5px] leading-snug",
              app.draft ? "text-navy" : "text-muted-foreground",
            )}
          >
            {app.draft ?? "Write a reply…"}
          </p>
          <button
            type="button"
            aria-label="Send"
            disabled={!app.draft}
            onClick={app.send}
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full bg-navy text-primary-foreground disabled:opacity-35",
              press,
            )}
          >
            <SendHorizontal className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}

const TERMS = [
  ["Nanny", "Jess Carter"],
  ["Start date", "1 June 2026"],
  ["Pay", "£18 an hour gross, paid monthly"],
  ["Hours", "Monday to Friday, 15:00 to 19:30"],
  ["Place of work", "12 Example Gardens, London W10"],
  ["Notice", "4 weeks"],
];

function SignRow({
  done,
  pop,
  who,
  detail,
}: {
  done: boolean;
  pop?: boolean;
  who: string;
  detail: string;
}) {
  return (
    <li className="flex gap-2.5">
      {done ? (
        <span
          className={cn(
            "grid size-[18px] shrink-0 place-items-center rounded-full bg-[#2f6b4a] text-white",
            pop && "wp-tick",
          )}
        >
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      ) : (
        <span className="size-[18px] shrink-0 rounded-full border-[1.5px] border-navy/30" />
      )}
      <div>
        <p className="text-[11.5px] text-navy">{who}</p>
        <p className="text-[10.5px] text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}

function AgreementScreen({ app }: ScreenProps) {
  const signedHere = useRef(false);
  if (app.signing) signedHere.current = true; // the tick only pops right after signing
  const done = app.signedAt !== null;
  return (
    <>
      <BackLink app={app} />
      <Title sub="Read it here, sign it here. Your signed copy stays in your wallet.">
        Your nanny agreement
      </Title>
      <div className={card}>
        <div className="flex items-baseline justify-between">
          <p className="font-display text-[16px] text-navy">Signing progress</p>
          <p className="text-[10.5px] tabular-nums text-muted-foreground">
            {done ? 2 : 1} of 2 signed
          </p>
        </div>
        <ul className="mt-3 space-y-3">
          <SignRow
            done={done}
            pop={signedHere.current}
            who="Parent / employer"
            detail={done ? `Emma Harrington · signed today at ${app.signedAt}` : "Not signed yet"}
          />
          <SignRow done who="Nanny / manny" detail="Jess Carter · signed 29 September 2026" />
        </ul>
      </div>
      <div className={card}>
        <p className="font-display text-[16px] text-navy">The basics</p>
        <dl className="mt-1.5 divide-y divide-border">
          {TERMS.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2 text-[11px]">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right text-navy">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-1.5 text-[11px] leading-[1.5] text-navy/80">
          Jess collects Oscar and Leo from school, gives them a healthy snack and dinner, helps with
          homework and reading, and leads active outdoor play.
        </p>
      </div>
      {done ? (
        <p className="wp-unblur flex items-center gap-2 rounded-[16px] bg-[#e4efe7] p-3 text-[11.5px] text-[#2f6b4a]">
          <Check className="size-4 shrink-0" aria-hidden />
          Signed by you and Jess. Your copy is saved in the wallet.
        </p>
      ) : (
        <div className={card}>
          <p className="text-[12px] font-medium text-navy">Sign as Emma Harrington</p>
          <div
            aria-hidden
            className="mt-2 flex h-11 items-end border-b border-dashed border-navy/25 pb-1.5"
          >
            {app.signing && (
              <span className="wp-sign font-display text-[24px] italic leading-none text-navy">
                Emma Harrington
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={app.sign}
            disabled={app.signing}
            className={cn(btnPrimary, "mt-3 w-full")}
          >
            Sign the agreement
          </button>
          <p className="mt-2 text-[9.5px] leading-[1.45] text-muted-foreground">
            Signing records your name, the date and time, and the version you signed.
          </p>
        </div>
      )}
    </>
  );
}

const CODES = [
  {
    title: "Front door key safe",
    body: "Grey box to the left of the porch, behind the lavender pot. Please scramble the dial after use.",
    code: "4 2 1 7",
  },
  {
    title: "Home WiFi",
    body: "Network: Harrington_Home. The guest network works for visitors too.",
    code: "scooter-race-28",
  },
  {
    title: "House alarm",
    body: "Panel is inside the hallway cupboard. You have 30 seconds after opening the door.",
    code: "8 3 5 0",
  },
];

const RULES = [
  [
    "Neighbour with a spare key",
    "Margaret at No. 14 (blue door) is home most days and happy to help.",
  ],
  ["Snacks", "Fruit, crackers and cheese any time. Biscuits only after dinner. Nut-free house."],
  [
    "Screen time",
    "Weekdays: 30 minutes after homework, none before school. Fridays are film night.",
  ],
];

const REVEAL_SECONDS = 6;

function HouseScreen({ app }: ScreenProps) {
  // Seconds left for each revealed code. Codes hide themselves, like in the real wallet.
  const [left, setLeft] = useState<Record<string, number>>({});
  const shown = Object.keys(left);
  useEffect(() => {
    if (shown.length === 0) return;
    const t = setInterval(
      () =>
        setLeft((cur) =>
          Object.fromEntries(
            Object.entries(cur)
              .filter(([, n]) => n > 1)
              .map(([k, n]) => [k, n - 1]),
          ),
        ),
      1000,
    );
    return () => clearInterval(t);
  }, [shown.length]);
  const setShown = (fn: (s: string[]) => string[]) =>
    setLeft((cur) => {
      const next = fn(Object.keys(cur));
      return Object.fromEntries(next.map((k) => [k, cur[k] ?? REVEAL_SECONDS]));
    });
  return (
    <>
      <BackLink app={app} />
      <Title sub="Codes stay hidden until someone taps Reveal.">House manual & codes</Title>
      <Label>Access, codes and keys</Label>
      {CODES.map((c) => {
        const on = shown.includes(c.title);
        return (
          <div key={c.title} className={card}>
            <p className="text-[12.5px] font-medium text-navy">{c.title}</p>
            <p className="mt-1 text-[11px] leading-[1.45] text-muted-foreground">{c.body}</p>
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
              <span className="flex min-w-0 items-center gap-1.5 text-navy">
                <KeyRound className="size-3.5 shrink-0" aria-hidden />
                {on ? (
                  <span className="wp-unblur truncate text-[12px] font-medium tracking-[0.06em] tabular-nums">
                    {c.code}
                  </span>
                ) : (
                  <>
                    <span className="sr-only">Hidden</span>
                    <span
                      aria-hidden
                      className="text-[12px] tracking-[0.25em] text-muted-foreground"
                    >
                      ••••••
                    </span>
                  </>
                )}
              </span>
              <button
                type="button"
                aria-label={`${on ? "Hide" : "Reveal"} the ${c.title.toLowerCase()} code`}
                onClick={() =>
                  setShown((s) => (on ? s.filter((t) => t !== c.title) : [...s, c.title]))
                }
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border px-2.5 text-[10.5px] text-navy",
                  press,
                )}
              >
                {on ? (
                  <EyeOff className="size-3" aria-hidden />
                ) : (
                  <Eye className="size-3" aria-hidden />
                )}
                {on ? `Hide · ${left[c.title]}s` : "Reveal"}
              </button>
            </div>
          </div>
        );
      })}
      <Label>House rules</Label>
      <List>
        {RULES.map(([t, b]) => (
          <div key={t} className="px-3.5 py-2.5">
            <p className="text-[12px] font-medium text-navy">{t}</p>
            <p className="mt-0.5 text-[11px] leading-[1.45] text-muted-foreground">{b}</p>
          </div>
        ))}
      </List>
    </>
  );
}

type Win = {
  who: "Oscar" | "Leo";
  shift: number; // how many shifts ago
  sport: string;
  skill: string;
  mins: number;
  confidence: number;
  effort: number;
  badge?: string;
  note: string;
  by: string;
};

const WINS: Win[] = [
  {
    who: "Oscar",
    shift: 0,
    sport: "Football",
    skill: "Ball control",
    mins: 45,
    confidence: 4,
    effort: 5,
    badge: "Dribble Master",
    note: "Ten keepy-uppies in a row!",
    by: "Jess Carter",
  },
  {
    who: "Leo",
    shift: 1,
    sport: "Scooter",
    skill: "Balance",
    mins: 30,
    confidence: 3,
    effort: 4,
    badge: "First Big Hill",
    note: "Rode down the hill without stopping",
    by: "Jess Carter",
  },
  {
    who: "Leo",
    shift: 4,
    sport: "Swimming",
    skill: "Water confidence",
    mins: 30,
    confidence: 3,
    effort: 5,
    note: "Put his face in the water for the first time",
    by: "you",
  },
];

function PassportScreen({ app }: ScreenProps) {
  const [who, setWho] = useState<"Both" | Win["who"]>("Both");
  const shifts = workedDays(app.today, 5);
  const wins = WINS.filter((w) => who === "Both" || w.who === who);
  const stats = [
    [wins.length, "Activities"],
    [wins.reduce((n, w) => n + w.mins, 0), "Active minutes"],
    [wins.filter((w) => w.badge).length, "Badges"],
  ] as const;
  return (
    <>
      <BackLink app={app} />
      <Title sub="Sports skills, outdoor challenges and confidence wins from after-school time.">
        Active Kids Passport
      </Title>
      <div role="group" aria-label="Show" className="grid grid-cols-3 rounded-[12px] bg-paper p-1">
        {(["Both", "Oscar", "Leo"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={who === k}
            onClick={() => setWho(k)}
            className={cn(
              "h-7 cursor-pointer rounded-[9px] text-[11px] transition-[background-color,color,box-shadow] duration-200",
              who === k
                ? "bg-card text-navy shadow-[0_1px_3px_rgb(29_42_68/0.12)]"
                : "text-muted-foreground",
            )}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(([n, label]) => (
          <div key={label} className={cn(card, "p-2.5")}>
            <p className="font-display text-[21px] leading-none tabular-nums text-navy">{n}</p>
            <p className="mt-1 text-[9.5px] leading-tight text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      {wins.map((w) => (
        <div key={w.sport} className={card}>
          <p className="text-[10px] text-muted-foreground">
            {shortDate(shifts[w.shift]!)} · {w.who}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] font-medium text-navy">{w.sport}</p>
            <span className="rounded-full bg-paper px-2 py-0.5 text-[9.5px] text-navy">
              {w.skill}
            </span>
          </div>
          <p className="mt-1 text-[10.5px] tabular-nums text-muted-foreground">
            {w.mins} min · Confidence {w.confidence}/5 · Effort {w.effort}/5
          </p>
          {w.badge && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#fbf0cf] px-2 py-1 text-[10px] font-medium text-[#76591a]">
              <Medal className="size-3" aria-hidden />
              {w.badge}
            </span>
          )}
          <p className="mt-2 font-display text-[14px] italic leading-snug text-navy">{w.note}</p>
          <p className="mt-1.5 text-[9.5px] text-muted-foreground">Added by {w.by}</p>
        </div>
      ))}
    </>
  );
}

function PhotoPost({ post }: { post: Post }) {
  const [liked, setLiked] = useState(Boolean(post.loved));
  return (
    <div className={cn(card, "overflow-hidden p-0")}>
      {post.photo && (
        <img
          src={post.photo}
          alt={post.caption}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      )}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <img src={DEMO_AVATARS["jess"]!} alt="" className="size-5 rounded-full object-cover" />
          <p className="text-[11px] font-medium text-navy">
            Jess · {post.time}
            {post.child ? ` · ${post.child}` : " · Oscar and Leo"}
          </p>
        </div>
        {post.milestone && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#fbf0cf] px-2 py-0.5 text-[10px] font-medium text-[#76591a]">
            <Sparkles className="size-2.5" aria-hidden /> {post.milestone}
          </span>
        )}
        <p className="mt-1.5 text-[11.5px] leading-[1.5] text-foreground">{post.caption}</p>
        <button
          type="button"
          aria-pressed={liked}
          onClick={() => setLiked((v) => !v)}
          className={cn(
            "mt-2 inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-[10.5px]",
            liked ? "text-[#b4234a]" : "text-navy",
            press,
          )}
        >
          <Heart className={cn("size-3", liked && "fill-current")} aria-hidden />
          {liked ? "Loved" : "Love"}
        </button>
      </div>
    </div>
  );
}

/** Today at 17:45, as Jess and the parents see it: what has happened, and what is next. */
const TODAY_ITEMS: {
  at: string | null;
  title: string;
  sub?: string;
  state: "done" | "next" | "later";
  attention?: boolean;
  photo?: string;
}[] = [
  {
    at: null,
    title: "Homework today",
    sub: "Reading for 20 minutes and spelling list 12. Leo: reading book, pages 14 and 15",
    state: "done",
  },
  {
    at: "15:15",
    title: "Collected Oscar and Leo from school",
    state: "done",
    photo: "/images/demo/school-run.jpg",
  },
  { at: "15:40", title: "Snack: apple, cheese and crackers", state: "done" },
  {
    at: "16:05",
    title: "Oscar's homework done",
    sub: "Reading and spellings, 10 out of 10",
    state: "done",
  },
  {
    at: "16:10",
    title: "Calpol given to Oscar",
    sub: "5ml for a sore throat · next safe from 20:10",
    state: "done",
    attention: true,
  },
  {
    at: "16:30",
    title: "Tennis at the park",
    sub: "Oscar · ten serves in a row",
    state: "done",
    photo: "/images/demo/tennis.jpg",
  },
  {
    at: "17:40",
    title: "Dinner is on",
    sub: "Leo is on sauce duty",
    state: "done",
    photo: "/images/demo/chef.jpg",
  },
  { at: "18:45", title: "Leo's bath", state: "next" },
  { at: "19:00", title: "Oscar's bath and reading", state: "later" },
  { at: "19:30", title: "Shift ends", sub: "Jess sends the end-of-day summary", state: "later" },
];

/** The day's items with anything logged from this phone slotted in before what is still to come. */
function todayItems(app: WalletApp): typeof TODAY_ITEMS {
  const next = TODAY_ITEMS.findIndex((i) => i.state !== "done");
  return [
    ...TODAY_ITEMS.slice(0, next),
    ...app.store.logged.map((l) => ({ ...l, state: "done" as const })),
    ...TODAY_ITEMS.slice(next),
  ];
}

function TodayDot({ item }: { item: (typeof TODAY_ITEMS)[number] }) {
  return (
    <span
      className={cn(
        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
        item.attention
          ? "bg-[#fbf0cf] text-[#76591a]"
          : item.state === "next"
            ? "bg-navy text-white"
            : item.state === "later"
              ? "bg-muted text-muted-foreground"
              : "bg-[#e4efe7] text-[#2f6b4a]",
      )}
    >
      {item.state === "done" ? (
        <Check className="size-3" aria-hidden />
      ) : (
        <Clock3 className="size-3" aria-hidden />
      )}
    </span>
  );
}

/** Home: the afternoon at a glance, so the first screen shows the day is already in motion. */
function TodayCard({ app }: ScreenProps) {
  const items = todayItems(app);
  const done = items.filter((i) => i.state === "done" && i.at);
  const rows = [...done.slice(-2), ...items.filter((i) => i.state !== "done").slice(0, 2)];
  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-navy-mid">Latest</p>
        <button
          type="button"
          onClick={() => app.push("today")}
          className={cn("text-[10.5px] font-medium text-navy underline underline-offset-2", press)}
        >
          Whole day
        </button>
      </div>
      <div className="mt-2.5 rounded-[12px] bg-[#fbf0cf] px-2.5 py-2 text-[11px] leading-[1.45] text-[#5c4614]">
        <span className="font-semibold">Homework today:</span> reading for 20 minutes and spelling
        list 12
      </div>
      <ul className="mt-2.5 space-y-2">
        {rows.map((i, n) => (
          <li key={n} className="flex gap-2.5">
            <TodayDot item={i} />
            <div className="min-w-0">
              <p className="text-[11.5px] font-medium text-navy">
                <span className="tabular-nums text-muted-foreground">{i.at}</span> {i.title}
                {i.state === "next" && (
                  <span className="ml-1.5 rounded-full bg-navy px-1.5 py-px text-[9px] font-medium text-white">
                    Next
                  </span>
                )}
              </p>
              {i.sub && (
                <p className="text-[10.5px] leading-[1.4] text-muted-foreground">{i.sub}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The whole day, with photos, medicine and what is still to come. */
function TodayScreen({ app }: ScreenProps) {
  return (
    <>
      <BackLink app={app} />
      <Title sub="Everything from Jess's shift in one place, newest at the bottom.">Today</Title>
      <ol className="space-y-3">
        {todayItems(app).map((i, n) => (
          <li key={n} className="flex gap-2.5">
            <TodayDot item={i} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[12px] font-medium",
                  i.state === "later" ? "text-muted-foreground" : "text-navy",
                )}
              >
                <span className="tabular-nums text-muted-foreground">{i.at ?? "Today"}</span>{" "}
                {i.title}
                {i.attention && (
                  <span className="ml-1.5 rounded-full bg-[#fbf0cf] px-1.5 py-px text-[9px] font-medium text-[#76591a]">
                    Check
                  </span>
                )}
                {i.state === "next" && (
                  <span className="ml-1.5 rounded-full bg-navy px-1.5 py-px text-[9px] font-medium text-white">
                    Next
                  </span>
                )}
              </p>
              {i.sub && (
                <p className="text-[10.5px] leading-[1.45] text-muted-foreground">{i.sub}</p>
              )}
              {i.photo && (
                <img
                  src={i.photo}
                  alt=""
                  loading="lazy"
                  className="mt-1.5 aspect-[16/9] w-full rounded-[12px] object-cover"
                />
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Home: the latest photo from Jess, so the first screen already feels alive. */
function LatestPhoto({ app }: ScreenProps) {
  const latest = AFTER_SCHOOL_DAY.filter((p) => p.photo).at(-1);
  if (!latest) return null;
  return (
    <button
      type="button"
      onClick={() => app.push("moments")}
      className={cn(card, "flex w-full items-center gap-3 overflow-hidden p-2.5 text-left", press)}
    >
      <img
        src={latest.photo}
        alt=""
        loading="lazy"
        className="size-14 shrink-0 rounded-[12px] object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-navy-mid">
          New from Jess · {latest.time}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-foreground">
          {latest.caption}
        </span>
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
    </button>
  );
}

/** Photo moments: the day as Jess shares it, newest first. */
function MomentsScreen({ app }: ScreenProps) {
  const posts = [...AFTER_SCHOOL_DAY].reverse();
  return (
    <>
      <BackLink app={app} />
      <Title sub="The good bits of the afternoon, as Jess shares them.">Photo moments</Title>
      {posts.map((p) => (
        <PhotoPost key={p.time + p.caption} post={p} />
      ))}
    </>
  );
}

/** Safe-dose lockout: the next dose is blocked until the gap since the last one has passed. */
function MedicineScreen({ app }: ScreenProps) {
  const mins = app.today.getHours() * 60 + app.today.getMinutes();
  const given = 16 * 60 + 10; // Calpol, given by Jess: the same dose as on today's timeline
  const safeAt = given + 4 * 60;
  const locked = mins >= given && mins < safeAt;
  const left = safeAt - mins;
  const vitamin = app.store.vitaminAt;
  return (
    <>
      <BackLink app={app} />
      <Title sub="Every dose, timestamped, with who gave it.">Medication log</Title>
      <div className={card}>
        <p className="text-[12.5px] font-medium text-navy">Oscar · Calpol</p>
        <p className="mt-1 text-[11px] leading-[1.45] text-muted-foreground">
          Last dose 16:10 · 5ml · given by Jess
        </p>
        {locked ? (
          <div className="mt-2.5 flex items-start gap-2 rounded-[12px] bg-warning-soft p-2.5 text-warning">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <div>
              <p className="text-[11.5px] font-semibold">Safe-dose lockout until 20:10</p>
              <p className="mt-0.5 text-[10.5px]">
                {Math.floor(left / 60)}h {left % 60}m left before another dose is safe.
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2.5 text-[11px] font-medium text-primary">
            A further dose is due now if needed
          </p>
        )}
        <button
          type="button"
          disabled
          className={cn(btnOutline, "mt-2.5 w-full disabled:opacity-50")}
        >
          <Lock aria-hidden />
          {locked ? "Locked until 20:10" : "Ask Jess before giving more"}
        </button>
      </div>
      <div className={card}>
        <p className="text-[12.5px] font-medium text-navy">Leo · Vitamin D drops</p>
        <p className="mt-1 text-[11px] leading-[1.45] text-muted-foreground">
          {vitamin ? `Given today at ${vitamin} · by you` : "Once a day · not given yet today"}
        </p>
        <button
          type="button"
          disabled={vitamin !== null}
          onClick={() => {
            const at = hhmm(app.today);
            app.set((st) => ({
              ...st,
              vitaminAt: at,
              logged: [
                ...st.logged,
                { at, title: "Vitamin D drops given to Leo", sub: "Logged by you" },
              ],
            }));
          }}
          className={cn(btnPrimary, "mt-2.5 h-10 w-full")}
        >
          {vitamin ? <Check aria-hidden /> : <Pill aria-hidden />}
          {vitamin ? "Given today" : "Log today's dose"}
        </button>
      </div>
      <p className="text-[10.5px] leading-[1.45] text-muted-foreground">
        Always follow the instructions on the packaging and the parents' written permission.
      </p>
    </>
  );
}

/** The household float: one shared running balance. */
function CashScreen({ app }: ScreenProps) {
  const added = app.store.spent.reduce((n, e) => n + e.amount, 0);
  const entries: [string, string, string][] = [
    ...app.store.spent.map((e): [string, string, string] => [
      e.what,
      "You · just now",
      `−£${e.amount.toFixed(2)}`,
    ]),
    ["Snacks after swimming", "Jess", "−£6.20"],
    ["Bus fare to the museum", "Jess", "−£4.80"],
    ["Weekly float", "Emma", "+£50.00"],
  ];
  return (
    <>
      <BackLink app={app} />
      <Title sub="No more scraps of receipts or guessing what's left.">Petty cash float</Title>
      <div className="rounded-[22px] bg-navy p-4 text-white shadow-md">
        <p className="text-[11px] text-white/70">Household float balance</p>
        <p className="mt-0.5 font-display text-[34px] leading-none tabular-nums">
          £{(42.5 - added).toFixed(2)}
        </p>
        <p className="mt-2.5 text-[11px] text-white/70">
          Spent this month{" "}
          <span className="font-semibold tabular-nums text-white">£{(11 + added).toFixed(2)}</span>
        </p>
      </div>
      <Label>History</Label>
      <List>
        {entries.map(([what, who, amount], i) => (
          <div key={i} className="flex items-center gap-2 px-3.5 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-medium text-navy">{what}</span>
              <span className="block text-[10.5px] text-muted-foreground">{who}</span>
            </span>
            <span
              className={cn(
                "text-[12px] font-semibold",
                amount.startsWith("+") ? "text-primary" : "text-navy",
              )}
            >
              {amount}
            </span>
          </div>
        ))}
      </List>
      <BottomBar>
        <button
          type="button"
          onClick={() => app.openSheet("Add an expense")}
          className={cn(btnPrimary, "h-10 w-full")}
        >
          <Plus aria-hidden />
          Add an expense
        </button>
      </BottomBar>
    </>
  );
}

/** Holiday entitlement as a ring that fills as days are taken. */
function LeaveScreen({ app }: ScreenProps) {
  const total = 28;
  const status = app.store.leave;
  const taken = 9 + (status === "approved" ? 2 : 0);
  const decide = (leave: Store["leave"]) => app.set((st) => ({ ...st, leave }));
  return (
    <>
      <BackLink app={app} />
      <Title sub="Worked out from the signed agreement.">Holiday & leave</Title>
      <div className={cn(card, "flex items-center gap-4")}>
        <div className="relative size-[76px] shrink-0">
          <svg viewBox="0 0 36 36" className="size-[76px] -rotate-90" aria-hidden>
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              strokeWidth="3"
              className="stroke-border"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${(taken / total) * 100} 100`}
              className="stroke-primary"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-display text-[20px] leading-none tabular-nums text-navy">
                {total - taken}
              </p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">days left</p>
            </div>
          </div>
        </div>
        <div className="text-[11px] leading-[1.6] text-muted-foreground">
          <p>
            <span className="font-semibold text-navy">{taken}</span> taken
          </p>
          <p>
            <span className="font-semibold text-navy">{status === "pending" ? 2 : 0}</span> awaiting
            approval
          </p>
          <p>{total} days a year (5.6 weeks × 5 days)</p>
        </div>
      </div>
      {status === "pending" ? (
        <div className={card}>
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-navy-mid">
            Jess asked for time off
          </p>
          <p className="mt-1.5 text-[12.5px] font-medium text-navy">Fri 18 and Mon 21 Dec</p>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground">
            2 days · "Family wedding in Leeds"
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => decide("declined")}
              className={cn(btnOutline, "h-10")}
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => decide("approved")}
              className={cn(btnPrimary, "h-10 flex-1")}
            >
              <Check aria-hidden />
              Approve 2 days
            </button>
          </div>
        </div>
      ) : (
        <p
          className={cn(
            "wp-unblur flex items-center gap-2 rounded-[16px] p-3 text-[11.5px]",
            status === "approved" ? "bg-[#e4efe7] text-[#2f6b4a]" : "bg-paper text-navy",
          )}
        >
          <Check className="size-4 shrink-0" aria-hidden />
          {status === "approved"
            ? "Approved. Jess has been told, and the days are on the calendar."
            : "Declined. Jess has been told."}
        </p>
      )}
      <Label>Booked</Label>
      <List>
        {[
          ...(status === "approved" ? [["Family wedding", "Fri 18 and Mon 21 Dec · 2 days"]] : []),
          ["Half term", "Mon 27 to Fri 30 Oct · 4 days"],
          ["Summer holiday", "Mon 4 to Fri 8 Aug · 5 days"],
        ].map(([t, d]) => (
          <div key={t} className="px-3.5 py-2.5">
            <p className="text-[12px] font-medium text-navy">{t}</p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">{d} · approved</p>
          </div>
        ))}
      </List>
    </>
  );
}

/* ---------- Sheets ---------- */

/** A bar that stays above the tab bar, so the main action is always under the thumb. */
function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 -mb-6 mt-auto border-t border-border bg-background/90 px-3 pb-3 pt-2.5 backdrop-blur">
      {children}
    </div>
  );
}

type Form = {
  intro: string;
  presets: string[];
  placeholder: string;
  amount?: boolean;
  save: (app: WalletApp, text: string, amount: number) => void;
};

const logAs = (kind: string) => (app: WalletApp, text: string) => {
  const at = hhmm(app.today);
  app.set((st) => ({
    ...st,
    logged: [...st.logged, { at, title: text, sub: `${kind} · added by you` }],
  }));
};

const FORMS: Record<string, Form> = {
  "Add a note": {
    intro: "Jess sees it straight away, and it stays on today's timeline.",
    presets: ["PE kit is in the hall", "Grandma collects on Friday", "Check Leo's reading book"],
    placeholder: "Write a note",
    save: logAs("Note"),
  },
  "Log a meal": {
    intro: "What they ate, on today's timeline.",
    presets: ["Snack: fruit and crackers", "Dinner: pasta and vegetables", "Drink: milk"],
    placeholder: "What did they eat?",
    save: logAs("Meal"),
  },
  "Log an activity": {
    intro: "What you did together, on today's timeline.",
    presets: ["Park and scooters", "Homework and reading", "Baking together"],
    placeholder: "What did you do?",
    save: logAs("Activity"),
  },
  "Add an event": {
    intro: "It shows on the calendar for you and Jess. Start with a time, like 16:00.",
    presets: ["16:00 Playdate at the park", "17:00 Dentist check-up", "16:30 Football club"],
    placeholder: "16:00 Playdate",
    save: (app, text) => {
      const m = text.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
      app.set((st) => ({
        ...st,
        events: [
          ...st.events,
          {
            day: st.calDay ?? weekday(app.today),
            time: m ? m[1]!.padStart(5, "0") : "Any",
            title: m ? m[2]! : text,
          },
        ],
      }));
    },
  },
  "Add an expense": {
    intro: "It comes off the household float straight away.",
    presets: ["Snacks", "Bus fare", "Craft supplies"],
    placeholder: "What was it for?",
    amount: true,
    save: (app, text, amount) =>
      app.set((st) => ({ ...st, spent: [{ what: text, amount }, ...st.spent] })),
  },
};

type Info = {
  intro: string;
  /** "tick": a checklist. "approve": each row has an Approve button. */
  mode?: "tick" | "approve";
  rows: (app: WalletApp) => [string, string?][];
};

const EMERGENCY: Info = {
  intro: "In an emergency call 999 first. Then call a parent.",
  rows: () => [
    ["Emma Harrington · Mum", "07700 900123"],
    ["Tom Harrington · Dad", "07700 900456"],
    ["GP · Portobello Road Surgery", "020 7946 0018"],
    ["Leo · mild nut allergy", "Piriton is in the kitchen drawer"],
    ["Oscar", "No allergies"],
    ["Home address", "12 Example Gardens, London W10"],
  ],
};

const INFO: Record<string, Info> = {
  "Emergency card": EMERGENCY,
  "Emergency contacts": EMERGENCY,
  "Weekly report": {
    intro: "This week so far, from Jess's shifts and updates.",
    rows: (app) => {
      const days = Math.min(weekday(app.today), 5);
      const spent = app.store.spent.reduce((n, e) => n + e.amount, 0);
      return [
        ["Hours worked", `${days * SHIFT_HOURS} of ${5 * SHIFT_HOURS} agreed, before today`],
        ["Daily updates", `${days} from Jess`],
        ["Medicine", "1 dose · Calpol for Oscar, today at 16:10"],
        [
          "Petty cash",
          `£${(11 + spent).toFixed(2)} spent · £${(42.5 - spent).toFixed(2)} left in the float`,
        ],
        ["Active Kids Passport", "3 activities · 105 active minutes · 2 badges"],
      ];
    },
  },
  "Kids' playbook": {
    intro: "The small things that make a day go well.",
    rows: () => [
      ["Oscar after school", "Ten quiet minutes with a book before homework"],
      ["Leo at bedtime", "Blue rabbit, then two stories"],
      ["Rainy-day ideas", "Den building, a Lego build-off, baking flapjacks"],
      ["Big moments", "Leo put his face in the water at swimming"],
    ],
  },
  "Nanny quick guide": {
    intro: "One page for Jess, made from what you've filled in.",
    rows: () => [
      ["Hours", "Monday to Friday, 15:00 to 19:30"],
      ["School pick-up", "15:15 · St Mary's Primary · Oscar and Leo"],
      ["Allergies", "Leo: mild nut allergy. Nut-free house"],
      ["Snacks", "Fruit, crackers and cheese. Biscuits only after dinner"],
      ["Screen time", "30 minutes after homework. Fridays are film night"],
      ["Spare key", "Margaret at No. 14"],
    ],
  },
  "First 48 hours": {
    intro: "Tick these off together in Jess's first two days.",
    mode: "tick",
    rows: () => [
      ["House tour and key safe"],
      ["Read the emergency card"],
      ["Meet the school office at pick-up"],
      ["Confirm allergies and medicine"],
      ["Agree how you'll message each other"],
    ],
  },
  "Travel pack": {
    intro: "For trips with the children.",
    mode: "tick",
    rows: () => [
      ["Passports"],
      ["Consent letter to travel with the children"],
      ["Travel insurance details"],
      ["Medicine and Calpol"],
      ["Emergency contacts while away"],
    ],
  },
  "Your nannies": {
    intro: "Everyone who looks after Oscar and Leo.",
    rows: (app) => [
      ["Jess Carter · Nanny", "Monday to Friday, 15:00 to 19:30"],
      ["Started", "1 June 2026"],
      [
        "Agreement",
        app.signedAt ? "Signed by you and Jess" : "Signed by Jess · waiting for your signature",
      ],
    ],
  },
  Timesheets: {
    intro: "Check the hours, then approve. Approved hours go to payroll.",
    mode: "approve",
    rows: (app) =>
      workedDays(app.today, 3).map((d): [string, string] => [
        shortDate(d),
        `15:00 to 19:30 · ${SHIFT_HOURS} hours`,
      ]),
  },
  "Payroll setup": {
    intro: "Taken from your signed agreement.",
    rows: () => [
      ["Pay rate", "£18 an hour gross"],
      ["Paid", "Monthly"],
      ["Agreed hours", "22.5 a week · £405.00 gross a week"],
    ],
  },
  "Employment costs": {
    intro: "What you've agreed to pay, before employer costs.",
    rows: () => [
      ["Gross pay", "£405.00 a week (22.5 hours at £18)"],
      ["Holiday", "28 days a year"],
      ["Employer costs", "National Insurance and pension are worked out by your payroll provider"],
    ],
  },
  "Nanny training": {
    intro: "Jess's training, with the certificates she has shared.",
    rows: () => [
      ["Paediatric first aid", "Certificate shared"],
      ["Safeguarding", "Certificate shared"],
      ["Food hygiene", "Certificate shared"],
    ],
  },
  "Safety records": {
    intro: "Checks your agency has verified.",
    rows: () => [
      ["DBS certificate", "Verified"],
      ["ID and right to work", "Verified"],
      ["References", "2 received"],
    ],
  },
};

const field =
  "h-10 w-full select-text rounded-[11px] border border-border bg-background px-3 text-[12px] text-navy outline-none placeholder:text-muted-foreground focus-visible:border-navy";

/** What the sheet holds: a form that saves, a page of content, or (for anything else) a short note. */
function SheetBody({
  app,
  titleId,
  action,
}: ScreenProps & { titleId: string; action: React.RefObject<HTMLButtonElement | null> }) {
  const label = app.sheet.label;
  const form = FORMS[label];
  const info = INFO[label];
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const pounds = Number(amount);
  const ready = text.trim() !== "" && (!form?.amount || pounds > 0);
  const title = (
    <p id={titleId} className="font-display text-[20px] leading-tight text-navy">
      {label}
    </p>
  );
  const intro = (copy: string) => (
    <p className="mt-1.5 text-[11.5px] leading-[1.5] text-muted-foreground">{copy}</p>
  );

  if (form) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          form.save(app, text.trim(), pounds);
          app.closeSheet();
        }}
      >
        {title}
        {intro(form.intro)}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {form.presets.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={text === preset}
              onClick={() => setText(preset)}
              className={cn(
                "h-8 rounded-full px-3 text-[10.5px]",
                text === preset ? "bg-navy text-primary-foreground" : "bg-paper text-navy",
                press,
              )}
            >
              {preset}
            </button>
          ))}
        </div>
        <input
          aria-label={form.placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={form.placeholder}
          maxLength={80}
          className={cn(field, "mt-2.5")}
        />
        {form.amount && (
          <input
            aria-label="Amount in pounds"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Amount, e.g. 4.50"
            inputMode="decimal"
            className={cn(field, "mt-2 tabular-nums")}
          />
        )}
        <button
          ref={action}
          type="submit"
          disabled={!ready}
          className={cn(btnPrimary, "mt-3 h-10 w-full")}
        >
          Save
        </button>
        <button type="button" onClick={app.closeSheet} className={cn(btn, "mt-1 w-full text-navy")}>
          Cancel
        </button>
      </form>
    );
  }

  if (info) {
    const rows = info.rows(app);
    const id = (row: string) => `${label}/${row}`;
    const toggle = (row: string) =>
      app.set((st) => ({ ...st, checks: { ...st.checks, [id(row)]: !st.checks[id(row)] } }));
    return (
      <>
        {title}
        {intro(info.intro)}
        <div className="mt-3 divide-y divide-border overflow-hidden rounded-[14px] border border-border">
          {rows.map(([row, sub]) => {
            const on = Boolean(app.store.checks[id(row)]);
            const text = (
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-navy">{row}</span>
                {sub && (
                  <span className="mt-0.5 block text-[10.5px] leading-[1.4] text-muted-foreground">
                    {sub}
                  </span>
                )}
              </span>
            );
            return info.mode === "tick" ? (
              <button
                key={row}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(row)}
                className={cn(
                  "flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left",
                  rowPress,
                )}
              >
                <span
                  className={cn(
                    "grid size-[18px] shrink-0 place-items-center rounded-full",
                    on ? "bg-[#2f6b4a] text-white" : "border-[1.5px] border-navy/30",
                  )}
                >
                  {on && <Check className="size-3" strokeWidth={3} aria-hidden />}
                </span>
                {text}
              </button>
            ) : (
              <div key={row} className="flex min-h-10 items-center gap-2.5 px-3 py-2">
                {text}
                {info.mode === "approve" && (
                  <button
                    type="button"
                    disabled={on}
                    onClick={() => toggle(row)}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[10.5px] font-medium",
                      on ? "bg-[#e4efe7] text-[#2f6b4a]" : "bg-navy text-primary-foreground",
                      press,
                    )}
                  >
                    {on && <Check className="size-3" aria-hidden />}
                    {on ? "Approved" : "Approve"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          ref={action}
          type="button"
          onClick={app.closeSheet}
          className={cn(btnPrimary, "mt-3 h-10 w-full")}
        >
          Done
        </button>
      </>
    );
  }

  return (
    <>
      {title}
      {intro("You'll find this in the Family Wallet app, coming to iOS and Android.")}
      <button
        ref={action}
        type="button"
        onClick={app.closeSheet}
        className={cn(btnPrimary, "mt-4 h-10 w-full")}
      >
        Got it
      </button>
    </>
  );
}

/** Lock & log out: the wallet stays shut until its owner opens it again. */
function LockScreen({ app }: ScreenProps) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center bg-background px-6 pb-12 pt-24 text-center">
      <LogoMark className="h-12 w-12" />
      <p className="mt-4 font-display text-[22px] leading-tight text-navy">Wallet locked</p>
      <p className="mt-1.5 text-[11.5px] leading-[1.5] text-muted-foreground">
        The Harrington Family. Codes, documents and messages stay hidden until you unlock.
      </p>
      <button
        type="button"
        autoFocus
        onClick={() => app.set((st) => ({ ...st, locked: false }))}
        className={cn(btnPrimary, "mt-auto h-11 w-full")}
      >
        <ScanFace aria-hidden />
        Unlock with Face ID
      </button>
    </div>
  );
}

const SCREENS: Record<Tab | Page, (props: ScreenProps) => ReactNode> = {
  home: HomeScreen,
  calendar: CalendarScreen,
  messages: MessagesScreen,
  family: FamilyScreen,
  more: MoreScreen,
  log: LogScreen,
  agreement: AgreementScreen,
  thread: ThreadScreen,
  house: HouseScreen,
  passport: PassportScreen,
  medicine: MedicineScreen,
  cash: CashScreen,
  leave: LeaveScreen,
  moments: MomentsScreen,
  today: TodayScreen,
};

/* ---------- The phone ---------- */

// Stacked outlines that give the phone an edge while it turns
const EDGES = [-2, -4, -6, -8, -10];
const shape = "rounded-[52px]";

export function WalletPhone({ app }: { app: WalletApp }) {
  const screenRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetAction = useRef<HTMLButtonElement>(null);
  const sheetTitle = useId();
  // Where a left-edge swipe started, for swipe-to-go-back
  const swipe = useRef<number | null>(null);
  const { nav, leaving, sheet } = app;

  // The phone waits with its back to the visitor, then spins round as it scrolls into view
  useEffect(() => {
    const el = app.bodyRef.current;
    const stage = app.stageRef.current;
    if (!el || !stage || typeof IntersectionObserver === "undefined" || reducedMotion()) return;
    el.setAttribute("data-armed", "");
    const anim = spinPhone(
      el,
      [
        { transform: "translateY(40px) rotateX(8deg) rotateY(-540deg) scale(0.92)" },
        { transform: "translateY(0px) rotateX(0deg) rotateY(0deg) scale(1)" },
      ],
      { duration: 1800, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    anim.pause();
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        el.removeAttribute("data-armed");
        anim.play();
      },
      { threshold: 0.45 },
    );
    io.observe(stage);
    return () => {
      io.disconnect();
      anim.cancel();
    };
  }, [app.bodyRef, app.stageRef]);

  // Keyboard and screen-reader users land on each new screen's title
  const focusTitle = () =>
    screenRef.current
      ?.querySelector<HTMLElement>('[data-state="top"] [data-title]')
      ?.focus({ preventScroll: true });
  const where = `${nav.tab}/${nav.stack.join("/")}`;
  const shown = useRef(where);
  useEffect(() => {
    // Not on load, including React's dev re-run of effects
    if (shown.current === where) return;
    shown.current = where;
    const active = document.activeElement;
    if (active && active !== document.body && !screenRef.current?.contains(active)) return;
    focusTitle();
  }, [where]);

  // Like any dialog: focus moves into the sheet, then back to the row that opened it
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (sheet.open) {
      opener.current = document.activeElement as HTMLElement | null;
      sheetAction.current?.focus({ preventScroll: true });
    } else if (sheetRef.current?.contains(document.activeElement)) {
      const back = opener.current;
      if (back && screenRef.current?.contains(back)) back.focus({ preventScroll: true });
      else focusTitle();
    }
  }, [sheet.open]);

  const layers = [
    { key: nav.tab, id: nav.tab as Tab | Page },
    ...nav.stack.map((id, i) => ({ key: `${nav.tab}/${i}/${id}`, id })),
  ];
  const last = layers.length - 1;

  return (
    <div
      ref={app.stageRef}
      className="wp-light relative mx-auto w-fit scroll-mt-32 [perspective:1600px] max-sm:[zoom:0.9]"
    >
      <div ref={app.bodyRef} className="wp-body relative [transform-origin:50%_50%_-6px]">
        {EDGES.map((z) => (
          <div
            key={z}
            aria-hidden
            className={cn("wp-edge absolute inset-0 bg-[#2a3346]", shape)}
            style={{ transform: `translateZ(${z}px)` }}
          />
        ))}
        <div
          aria-hidden
          className={cn(
            "wp-back absolute inset-0 overflow-hidden bg-[linear-gradient(150deg,#27324c,#121828_55%,#1d2639)]",
            shape,
          )}
          style={{ transform: "rotateY(180deg) translateZ(12px)", backfaceVisibility: "hidden" }}
        >
          <span className="absolute left-4 top-4 grid size-[112px] grid-cols-2 place-items-center rounded-[32px] bg-white/[0.06] p-2.5 ring-1 ring-white/10">
            <span className="size-10 rounded-full bg-[#0b0f19] ring-[5px] ring-white/10" />
            <span className="size-2.5 rounded-full bg-white/20" />
            <span className="size-10 rounded-full bg-[#0b0f19] ring-[5px] ring-white/10" />
            <span className="size-10 rounded-full bg-[#0b0f19] ring-[5px] ring-white/10" />
          </span>
          <span className="absolute inset-x-0 top-[46%] text-center font-display text-[22px] tracking-[-0.01em] text-white/35">
            Family Wallet
          </span>
        </div>

        <div
          id="wallet-phone"
          role="group"
          aria-label="Family Wallet demo you can use"
          className={cn(
            "wp-front relative h-[652px] w-[318px] select-none bg-[#0f1420] p-[9px] [-webkit-tap-highlight-color:transparent]",
            "shadow-[0_50px_100px_-30px_rgb(0_0_0/0.6),inset_0_0_0_1px_rgb(255_255_255/0.1),inset_0_0_0_3px_rgb(0_0_0/0.4)]",
            shape,
          )}
        >
          {/* Side buttons */}
          <span
            aria-hidden
            className="absolute -left-[3px] top-[104px] h-7 w-[3px] rounded-l bg-[#1b2232]"
          />
          <span
            aria-hidden
            className="absolute -left-[3px] top-[150px] h-12 w-[3px] rounded-l bg-[#1b2232]"
          />
          <span
            aria-hidden
            className="absolute -left-[3px] top-[208px] h-12 w-[3px] rounded-l bg-[#1b2232]"
          />
          <span
            aria-hidden
            className="absolute -right-[3px] top-[170px] h-20 w-[3px] rounded-r bg-[#1b2232]"
          />

          <div
            ref={screenRef}
            className="relative flex h-full flex-col overflow-hidden rounded-[43px] bg-background supports-[overflow:clip]:overflow-clip"
          >
            <div
              aria-hidden
              className="relative flex h-[42px] shrink-0 items-center justify-between px-7 pt-1.5 text-[12px] font-semibold text-navy"
            >
              <span className="tabular-nums">{hhmm(app.today)}</span>
              <span className="absolute left-1/2 top-[11px] h-[24px] w-[84px] -translate-x-1/2 rounded-full bg-[#0b0f19]" />
              <span className="flex items-center gap-1">
                <Signal className="size-3.5" strokeWidth={2.4} />
                <Wifi className="size-3.5" strokeWidth={2.4} />
                <BatteryFull className="size-[18px]" strokeWidth={1.8} />
              </span>
            </div>

            <div inert={sheet.open || app.store.locked} className="flex min-h-0 flex-1 flex-col">
              <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-border px-3.5">
                <LogoMark className="h-5 w-5" />
                <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-navy">
                  The Harrington Family
                </p>
                <HeaderAvatars today={app.today} />
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden supports-[overflow:clip]:overflow-clip">
                {layers.map((layer, i) => {
                  const state =
                    i === last
                      ? leaving
                        ? "leaving"
                        : "top"
                      : i === last - 1 && leaving
                        ? "top"
                        : "covered";
                  const Screen = SCREENS[layer.id];
                  return (
                    <div
                      key={layer.key}
                      // Router scroll restoration per screen, not per DOM position
                      // (a scrolled "Your wallet" used to reload as a scrolled Home)
                      data-scroll-restoration-id={`wallet-${layer.key}`}
                      data-state={state}
                      data-pushed={i > 0 ? "" : undefined}
                      inert={state !== "top"}
                      onAnimationEnd={(e) =>
                        e.target === e.currentTarget && state === "leaving" && app.popped()
                      }
                      onPointerDown={(e) => {
                        const fromEdge = e.clientX - e.currentTarget.getBoundingClientRect().left;
                        swipe.current = i > 0 && fromEdge < 28 ? e.clientX : null;
                      }}
                      onPointerUp={(e) => {
                        if (swipe.current !== null && e.clientX - swipe.current > 56) app.back();
                        swipe.current = null;
                      }}
                      className="wp-layer absolute inset-0 overflow-y-auto overflow-x-hidden bg-background"
                    >
                      <div className="flex min-h-full flex-col gap-3 px-4 pb-6 pt-4">
                        <Screen app={app} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <nav
                aria-label="Wallet"
                className="grid shrink-0 grid-cols-5 border-t border-border bg-card px-1 pb-[22px] pt-2"
              >
                {TABS.map(({ id, label, icon: Icon }) => {
                  const on = nav.tab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-current={on ? "page" : undefined}
                      onClick={() => app.tab(id)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-lg py-0.5 text-[9.5px]",
                        on ? "text-navy" : "text-muted-foreground/80",
                        press,
                      )}
                    >
                      <Icon className="size-[18px]" strokeWidth={on ? 2.1 : 1.6} aria-hidden />
                      {label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div
              data-open={sheet.open ? "" : undefined}
              className="wp-sheet-wrap absolute inset-0 z-20"
            >
              <div
                aria-hidden
                onClick={app.closeSheet}
                className="wp-backdrop absolute inset-0 bg-[#0b0f19]/35"
              />
              <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={sheetTitle}
                onKeyDown={(e) => e.key === "Escape" && app.closeSheet()}
                className="wp-sheet absolute inset-x-0 bottom-0 max-h-[82%] overflow-y-auto rounded-t-[26px] bg-card px-5 pb-9 pt-2.5 shadow-[0_-16px_40px_-16px_rgb(0_0_0/0.35)]"
              >
                <span aria-hidden className="mx-auto mb-4 block h-1 w-9 rounded-full bg-navy/15" />
                <SheetBody
                  key={`${sheet.label}/${sheet.open}`}
                  app={app}
                  titleId={sheetTitle}
                  action={sheetAction}
                />
              </div>
            </div>

            {app.store.locked && <LockScreen app={app} />}

            {/* Home indicator */}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-[7px] left-1/2 z-30 h-1 w-24 -translate-x-1/2 rounded-full bg-navy/80"
            />
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-6 left-1/2 -z-10 h-10 w-[76%] -translate-x-1/2 rounded-[100%] bg-black/50 blur-2xl"
      />
    </div>
  );
}
