// Stock photos for the sample Harrington wallet. They are placeholders (faces are not real family members) and only
// ever used for the demo wallet; a real wallet shows the photos its own family uploads.
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

type Post = { time: string; child: "Oscar" | "Leo" | null; caption: string; photo: string; milestone?: string };

/** A typical after-school afternoon with Jess, the kind of updates a parent would see on the way home from work. */
export const AFTER_SCHOOL_DAY: Post[] = [
  { time: "15:25", child: null, caption: "Collected both from St Mary's with big smiles. Snack next.", photo: "/images/demo/school-run.jpg" },
  { time: "16:05", child: "Leo", caption: "Felt-tip colouring at the table while snack settles. Leo is doing a dinosaur for Oscar.", photo: "/images/demo/colouring.jpg" },
  { time: "16:50", child: "Oscar", caption: "Serves are getting stronger at the park. Ten in a row!", photo: "/images/demo/tennis.jpg", milestone: "Ten serves in a row" },
  { time: "17:40", child: "Leo", caption: "Chef Leo is on pasta sauce duty. Very serious about the stirring.", photo: "/images/demo/chef.jpg" },
];

/** Earlier afternoons, so the feed has history. */
const EARLIER: Post[][] = [
  [
    { time: "15:30", child: "Oscar", caption: "Spellings done before the snack, so the rest of the afternoon is free.", photo: "/images/demo/artwork.jpg" },
    { time: "16:30", child: "Leo", caption: "Paint sticks out for the school display. Leo chose all the colours himself.", photo: "/images/demo/paint-sticks.jpg" },
  ],
  [
    { time: "16:10", child: null, caption: "Rainbow craft for Thursday's show and tell.", photo: "/images/demo/rainbow-craft.jpg" },
  ],
];

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
        kind: "photo",
        momentDate: date,
        caption: p.caption,
        milestoneLabel: p.milestone ?? null,
        childId: null,
        childName: p.child,
        photoUrl: p.photo,
        addedBy: "nanny",
        addedByName: "Jess",
        createdAt: `${date}T${p.time}:00Z`,
      });
    });
  });
  // Newest first, like the real feed.
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
