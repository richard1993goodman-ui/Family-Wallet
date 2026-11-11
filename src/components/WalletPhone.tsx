import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand";
import {
  Plus as PlusIcon,
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
  Medal,
  Menu,
  MessageCircle,
  NotebookPen,
  PanelLeft,
  Pill,
  Plane,
  SendHorizontal,
  ShieldCheck,
  Signal,
  Siren,
  Sparkles,
  StickyNote,
  UserPlus,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * A working copy of the Family Wallet for the landing page. Names and details come from the
 * public demo wallet, and nothing here talks to a server.
 */

export type Tab = "home" | "calendar" | "messages" | "family" | "more";
export type Page = "log" | "agreement" | "thread" | "house" | "passport";
type Msg = { from: "you" | "jess"; text: string; time: string };

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "family", label: "Family", icon: Users },
  { id: "more", label: "More", icon: Menu },
];

// On the server, and until the visitor's own clock takes over: Friday 6 November, 15:42
const FALLBACK = new Date(2026, 10, 6, 15, 42);
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
export function useWalletApp() {
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
    signing,
    signedAt,
    chat,
    reply,
    bodyRef,
    stageRef,
    today: now ?? FALLBACK,
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
const card = "rounded-[18px] border border-border bg-card p-3.5";
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
        <div className="mb-2 inline-flex rounded-full bg-navy/[0.06] p-0.5" role="tablist" aria-label="Calendar view">
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
          {view === "month" ? monthYear(today) : view === "week" ? `Week of ${shortDate(weekOf(day)[0]!)}` : longDate(day)}
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
            <span key={i} className="pb-1 text-center text-[9px] text-muted-foreground" aria-hidden>
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
                style={d.getDate() === 1 || (view === "week" && d === week[0]) ? { gridColumnStart: weekday(d) + 1 } : undefined}
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
  { id: 1, text: "Jess added 3 photos from the park", sub: "Photos · 12 min ago" },
  { id: 2, text: "Jess asked to swap Thursday's shift", sub: "Week plan · 3 hr ago" },
  { id: 3, text: "New holiday request for half term", sub: "Leave · 1 d ago" },
];

function PhoneBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(PHONE_ALERTS);
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
          <p className="border-b border-border px-3 py-2 text-[11px] font-semibold text-foreground">Notifications</p>
          {items.length === 0 ? (
            <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">You're all caught up.</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className="flex items-start gap-2 border-b border-border px-3 py-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] leading-snug text-foreground">{n.text}</p>
                  <p className="text-[9px] text-muted-foreground">{n.sub}</p>
                </div>
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
          <p className="border-b border-border px-3 py-2 text-[11px] font-semibold text-foreground">{title}</p>
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

// Live shift card: agreed weekday hours 15:00 to 19:30, with a progress bar (weekends have none)
function ShiftBanner({ today }: { today: Date }) {
  const day = today.getDay();
  if (day === 0 || day === 6) return null;
  const mins = today.getHours() * 60 + today.getMinutes();
  const start = 15 * 60;
  const end = 19 * 60 + 30;
  const pct = Math.min(100, Math.max(0, ((mins - start) / (end - start)) * 100));
  const left = Math.max(0, end - Math.max(mins, start));
  const live = mins >= start && mins < end;
  return (
    <div className="rounded-[18px] bg-card p-3.5 shadow-sm">
      <div className="flex items-center justify-between text-[10.5px]">
        <span className="font-semibold uppercase tracking-wider text-navy-mid">Shift 15:00 – 19:30</span>
        <span className="text-muted-foreground">
          {live ? `${Math.floor(left / 60)}h ${left % 60}m left` : mins < start ? "Starts 15:00" : "Finished"}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-navy-mid" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[12.5px] font-medium text-navy">
        {live ? "Jess is on duty" : mins < start ? "Jess starts this afternoon" : "Jess has finished for today"}
      </p>
    </div>
  );
}

function HomeScreen({ app }: ScreenProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 data-title tabIndex={-1} className={cn(titleCls, "text-[25px]")}>
            Welcome
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">{longDate(app.today)}</p>
        </div>
        <div className="flex gap-1.5">
          <PhoneMenu
            label="Quick add"
            icon={<PlusIcon className="h-4 w-4" aria-hidden />}
            title="Quick add"
            items={["Calendar event or playdate", "Note or message", "Medicine dose", "Expense"]}
            onPick={(i) => app.openSheet(i)}
          />
          <PhoneBell />
          <PhoneMenu
            label="Account and log out"
            icon={<UserIcon className="h-4 w-4" aria-hidden />}
            title="The Harrington Family · Parent access"
            items={["Emergency contacts", "Health & medicine", "Lock & log out"]}
            onPick={(i) => app.openSheet(i)}
          />
        </div>
      </div>
      <ShiftBanner today={app.today} />
      <MonthCard app={app} />
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
  const [day, setDay] = useState(today);
  const plans = plansFor(day);
  return (
    <>
      <Title sub="Agreed hours sync from your nanny agreement. Tap a day to see what's on.">
        Calendar
      </Title>
      <div className={card}>
        <p className="font-display text-[16px] text-navy">{monthYear(days[day]!)}</p>
        <WeekStrip today={app.today} selected={day} onSelect={setDay} />
      </div>
      <Label>{day === today ? "Today" : longDate(days[day]!)}</Label>
      {plans.length ? (
        <List>
          {plans.map((p) => (
            <div key={p.title} className="flex gap-3 px-3.5 py-2.5">
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
  { name: "Oscar", school: "Year 4 · St Mary's Primary" },
  {
    name: "Leo",
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
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#fde8d7] font-display text-[16px] text-[#8e4a1f]">
            {c.name[0]}
          </span>
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
    label: "Overview",
    items: [
      ["Home", Home, "home"],
      ["Calendar", CalendarDays, "calendar"],
      ["Messages", MessageCircle, "messages"],
      ["Weekly report", FileChartColumn],
    ],
  },
  {
    label: "Day to day",
    items: [
      ["Daily log", NotebookPen, "log"],
      ["Medication log", Pill],
      ["Handover & expenses", ClipboardCheck],
      ["Photo moments", Camera],
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
      ["Holiday & leave", CalendarCheck],
      ["Petty cash", Coins],
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
      <Title sub="Every page, by section.">Your wallet</Title>
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

function HouseScreen({ app }: ScreenProps) {
  const [shown, setShown] = useState<string[]>([]);
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
                {on ? "Hide" : "Reveal"}
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
};

/* ---------- The phone ---------- */

// Stacked outlines that give the phone an edge while it turns
const EDGES = [-2, -4, -6, -8, -10];
const shape = "rounded-[52px]";

export function WalletPhone({ app }: { app: WalletApp }) {
  const screenRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetAction = useRef<HTMLAnchorElement>(null);
  const sheetTitle = useId();
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
            The Family Wallet
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

            <div inert={sheet.open} className="flex min-h-0 flex-1 flex-col">
              <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-border px-2.5">
                <button
                  type="button"
                  aria-label="Menu"
                  onClick={() => app.tab("more")}
                  className={cn("grid size-8 place-items-center rounded-lg text-navy", press)}
                >
                  <PanelLeft className="size-4" aria-hidden />
                </button>
                <LogoMark className="h-5 w-5" />
                <p className="truncate text-[12.5px] font-medium text-navy">
                  The Harrington Family
                </p>
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
                className="wp-sheet absolute inset-x-0 bottom-0 rounded-t-[26px] bg-card px-5 pb-9 pt-2.5 shadow-[0_-16px_40px_-16px_rgb(0_0_0/0.35)]"
              >
                <span aria-hidden className="mx-auto mb-4 block h-1 w-9 rounded-full bg-navy/15" />
                <p id={sheetTitle} className="font-display text-[20px] leading-tight text-navy">
                  {sheet.label}
                </p>
                <p className="mt-1.5 text-[11.5px] leading-[1.5] text-muted-foreground">
                  You'll find this in the full demo wallet, filled in for the Harrington family.
                  This phone shows a few of the screens.
                </p>
                <a
                  ref={sheetAction}
                  href="/demo"

                  className={cn(btnPrimary, "mt-4 w-full")}
                >
                  Open the full demo
                  <ExternalLink aria-hidden />
                </a>
                <button
                  type="button"
                  onClick={app.closeSheet}
                  className={cn(btn, "mt-1 w-full text-navy")}
                >
                  Keep exploring
                </button>
              </div>
            </div>

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
