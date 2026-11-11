import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppStorePills } from "./AppStorePills";
import { WalletPhone, useWalletApp, type Page, type Tab } from "./WalletPhone";

// Each step opens the phone on that screen
const tour: { title: string; body: string; tab: Tab; page?: Page }[] = [
  {
    title: "The week, at a glance",
    body: "Agreed hours from the nanny agreement, on a calendar. Tap a day to see what's on.",
    tab: "calendar",
  },
  {
    title: "A daily log from your nanny or au pair",
    body: "What they did, what they ate and how the homework went, before you're home.",
    tab: "home",
    page: "log",
  },
  {
    title: "Messages, one thread per topic",
    body: "Private chats with your nanny that don't get lost in a group chat. Try sending a reply.",
    tab: "messages",
    page: "thread",
  },
  {
    title: "The agreement, signed in the wallet",
    body: "Hours, rates and terms, signed by you and your nanny. Tap Sign to try it.",
    tab: "home",
    page: "agreement",
  },
  {
    title: "Codes and the house manual",
    body: "WiFi, alarm and key safe codes stay hidden until someone taps Reveal.",
    tab: "family",
    page: "house",
  },
  {
    title: "The Active Kids Passport",
    body: "The sports each child is working on, and the badges they've earned.",
    tab: "home",
    page: "passport",
  },
];

/**
 * The front door is the wallet itself. The phone stays pinned while the steps scroll past,
 * and the step in the middle of the viewport drives which screen the phone shows.
 */
export function WalletHero() {
  const app = useWalletApp();
  const top = app.nav.stack.at(-1);
  const current = tour.findIndex((t) => (t.page ? t.page === top : !top && t.tab === app.nav.tab));
  const steps = useRef<(HTMLLIElement | null)[]>([]);
  const jump = useRef(app.jump);
  jump.current = app.jump;

  // Scrolling steps the phone along: the step crossing the middle of the viewport is the one shown
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const wide = window.matchMedia("(min-width: 1024px)");
    const io = new IntersectionObserver(
      (entries) => {
        if (!wide.matches) return;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const t = tour[steps.current.indexOf(e.target as HTMLLIElement)];
          if (t) jump.current(t.tab, t.page);
        }
      },
      { rootMargin: "-38% 0px -45% 0px" },
    );
    steps.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const open = (t: (typeof tour)[number]) => {
    app.jump(t.tab, t.page);
    // On a phone the list sits under the wallet, so bring the wallet back into view.
    const stage = app.stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    if (r.top < parseFloat(getComputedStyle(stage).scrollMarginTop) || r.bottom > innerHeight) {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stage.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    }
  };

  return (
    <section id="front" className="relative">
      <div className="mx-auto grid w-full max-w-[84rem] gap-x-10 px-4 sm:px-8 lg:grid-cols-12 lg:gap-x-8">
        <div className="pt-10 sm:pt-14 lg:col-span-6 lg:pt-20">
          <h1 className="heading-serif text-balance text-[2.75rem] leading-[1.02] text-foreground sm:text-[4rem] lg:text-[4.75rem]">
            Your household, in one wallet
          </h1>
          <p className="mt-7 max-w-[34rem] text-pretty text-lg leading-relaxed text-foreground sm:text-xl">
            Your family's private hub for your nanny, au pair or household staff. Schedules,
            agreements, household codes and day-to-day childcare, together in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              to="/login"
              className="inline-flex h-12 items-center rounded-full bg-brand px-6 text-[0.9375rem] font-medium text-brand-foreground transition-[scale,opacity] duration-150 hover:opacity-90 active:scale-[0.97]"
            >
              Open My Wallet
            </Link>
            <AppStorePills />
          </div>
        </div>

        {/* On a phone: headline, wallet, then steps; on desktop the wallet stays pinned beside them */}
        <figure className="mt-8 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:mt-0">
          <div className="lg:sticky lg:top-[4.5rem] lg:flex lg:flex-col lg:items-center lg:pt-4">
            <div className="grid place-items-center rounded-[28px] bg-tint-sage px-4 py-10 sm:py-14 lg:w-full lg:max-w-[34rem] lg:py-6">
              <WalletPhone app={app} />
            </div>
            <figcaption className="mt-3 flex flex-col items-center gap-2 text-center">
              <button
                type="button"
                onClick={app.spin}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-foreground/15 px-4 py-2 text-sm text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-foreground/[0.05] active:scale-[0.97] motion-reduce:hidden"
              >
                <RotateCw className="size-4" aria-hidden />
                Spin the phone
              </button>
              <span className="max-w-[22rem] text-xs leading-5 text-muted-foreground">
                The Harrington family and their nanny Jess are examples. Nothing here is live.
              </span>
            </figcaption>
          </div>
        </figure>

        <ol className="mt-10 lg:col-span-6 lg:mt-14 lg:pb-[28vh]">
          {tour.map((t, n) => {
            const on = n === current;
            return (
              <li
                key={t.title}
                ref={(el) => {
                  steps.current[n] = el;
                }}
                className="border-t border-border lg:flex lg:min-h-[44vh] lg:items-center"
              >
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  aria-controls="wallet-phone"
                  onClick={() => open(t)}
                  className="group block w-full cursor-pointer py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                >
                  <span
                    className={cn(
                      "heading-serif block text-[1.5rem] leading-tight transition-colors duration-300 sm:text-[1.875rem]",
                      on ? "text-foreground" : "text-muted-foreground/70 group-hover:text-foreground",
                    )}
                  >
                    {t.title}
                  </span>
                  <span
                    className={cn(
                      "mt-2 block max-w-[28rem] text-base leading-relaxed transition-colors duration-300",
                      on ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t.body}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
