// The sample Harrington wallet: one coherent after-school afternoon, shared by the home-screen phone and the
// demo wallet so both tell the same story. Photos are stock placeholders, never real family members.
import type { MomentRow } from "./moments.types";

export const DEMO_AVATARS: Record<string, string> = {
  emma: "/images/demo/emma.jpg",
  jess: "/images/demo/jess.jpg",
  oscar: "/images/demo/oscar.jpg",
  leo: "/images/demo/leo.jpg",
};

/** The stock avatar for a demo person, matched on first name ("Jess Carter" -> jess). */
export function demoAvatarFor(name: string | null | undefined): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return DEMO_AVATARS[first] ?? null;
}

/** The demo always shows the same moment: a school-day afternoon, 15 minutes before dinner goes on. */
export const DEMO_NOW = "17:45";
export const DEMO_SHIFT = { start: "15:00", end: "19:30", startedAt: "15:02" } as const;

type Child = "Oscar" | "Leo" | null;

export type Post = {
  time: string;
  child: Child;
  caption: string;
  /** Text-only updates (homework, notes) have no photo. */
  photo?: string;
  /** A milestone label, or the heading of a text update. */
  milestone?: string;
  /** Emma has loved it. */
  loved?: boolean;
};

/** Jess's updates today, in the order they arrived. */
export const AFTER_SCHOOL_DAY: Post[] = [
  { time: "15:25", child: null, caption: "Collected both from St Mary's with big smiles. Snack next.", photo: "/images/demo/school-run.jpg", loved: true },
  { time: "16:05", child: "Oscar", caption: "Homework done before anything else: reading for 20 minutes and spelling list 12. He got 10 out of 10 on the practice test.", milestone: "Homework done", loved: true },
  { time: "16:10", child: "Leo", caption: "Felt-tip colouring at the table while Oscar finished his spellings. Leo is doing a dinosaur for him.", photo: "/images/demo/colouring.jpg" },
  { time: "16:50", child: "Oscar", caption: "Tennis at the park after the Calpol had kicked in. Serves are getting stronger!", photo: "/images/demo/tennis.jpg", milestone: "Ten serves in a row", loved: true },
  { time: "17:40", child: "Leo", caption: "Chef Leo is on pasta sauce duty. Very serious about the stirring.", photo: "/images/demo/chef.jpg" },
];

/** Earlier afternoons, so the feed has history. */
const EARLIER: Post[][] = [
  [
    { time: "15:30", child: "Oscar", caption: "Spellings done before the snack, so the rest of the afternoon is free.", photo: "/images/demo/artwork.jpg", loved: true },
    { time: "16:30", child: "Leo", caption: "Paint sticks out for the school display. Leo chose all the colours himself.", photo: "/images/demo/paint-sticks.jpg" },
    { time: "18:20", child: "Leo", caption: "Read two whole books by himself tonight.", milestone: "Reading", loved: true },
  ],
  [
    { time: "16:10", child: null, caption: "Rainbow craft for Thursday's show and tell.", photo: "/images/demo/rainbow-craft.jpg", loved: true },
  ],
];

/* ---- The rest of today, as the calendar, timeline and phone show it ---- */

export type DemoEntry = { time: string | null; end?: string; title: string; child: Child; type: "activity" | "note" };

/** Notes and plans for today. */
export const DEMO_PLAN: DemoEntry[] = [
  { time: null, title: "Homework today: reading for 20 minutes and spelling list 12. Leo: reading book, pages 14 and 15", child: null, type: "note" },
  { time: "16:30", end: "17:15", title: "Tennis at the park", child: "Oscar", type: "activity" },
];

export const DEMO_CARE: { time: string; detail: string; child: Child }[] = [
  { time: "15:40", detail: "Snack: apple, cheese and crackers", child: null },
  { time: "17:20", detail: "Snack: banana after tennis", child: "Oscar" },
];

export const DEMO_DOSE = { time: "16:10", medicine: "Calpol (paracetamol)", dose: "5ml", child: "Oscar", reason: "Sore throat", nextAt: "20:10" } as const;

const day = (today: Date, back: number) => {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - back));
  return d.toISOString().slice(0, 10);
};

/** Photo updates for the demo wallet, dated relative to today so it always looks current. */
export function demoMoments(today = new Date()): MomentRow[] {
  const days: Post[][] = [AFTER_SCHOOL_DAY, ...EARLIER];
  const out: MomentRow[] = [];
  days.forEach((posts, back) => {
    const date = day(today, back);
    posts.forEach((p, i) => {
      out.push({
        id: `demo-${back}-${i}`,
        kind: p.photo ? "photo" : "milestone",
        momentDate: date,
        caption: p.caption,
        milestoneLabel: p.milestone ?? null,
        childId: null,
        childName: p.child,
        photoUrl: p.photo ?? null,
        addedBy: "nanny",
        addedByName: "Jess",
        createdAt: `${date}T${p.time}:00Z`,
        lovedBy: p.loved ? ["family"] : [],
      });
    });
  });
  // Newest first, like the real feed.
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
