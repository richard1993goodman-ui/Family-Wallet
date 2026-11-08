import { ArrowRight, RotateCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { WalletPhone, useWalletApp, type Page, type Tab } from "./WalletPhone";

// Each one opens the phone on that screen
const tour: { title: string; body: string; tab: Tab; page?: Page }[] = [
  {
    title: "The week, at a glance",
    body: "Agreed hours from your nanny agreement, on a calendar. Tap a day to see what's on.",
    tab: "calendar",
  },
  {
    title: "A daily log from your nanny",
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
    title: "Your agreement, signed in the wallet",
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

export function WalletShowcase() {
  const app = useWalletApp();
  const top = app.nav.stack.at(-1);
  const current = tour.findIndex((t) => (t.page ? t.page === top : !top && t.tab === app.nav.tab));

  const open = (t: (typeof tour)[number]) => {
    app.jump(t.tab, t.page);
    // On a phone the list sits under the wallet, so bring the wallet back into view.
    // Measure the stage, not the phone, which may be mid-spin; its scroll-mt clears the sticky header.
    const stage = app.stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    if (r.top < parseFloat(getComputedStyle(stage).scrollMarginTop) || r.bottom > innerHeight) {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stage.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    }
  };

  return (
    <section
      id="family-wallet"
      className="section-y overflow-hidden bg-ink-band text-white"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 md:px-6 lg:grid-cols-[1fr_auto] lg:grid-rows-[auto_1fr] lg:gap-x-20 lg:gap-y-0">
        <div className="lg:self-end">
          <h2 className="max-w-xl text-4xl leading-[1.1] md:text-5xl">
            Everything about your nanny, in one private wallet
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/70">
            Every family we work with gets the Family Wallet, free with membership. It's on your
            phone behind a private link and code, and your nanny keeps it up to date.
          </p>
        </div>

        <figure className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <WalletPhone app={app} />
          <figcaption className="mx-auto mt-10 flex max-w-[318px] flex-col items-center gap-3 text-center">
            <button
              type="button"
              onClick={app.spin}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/85 transition-[background-color,scale] duration-150 ease-out hover:bg-white/[0.06] active:scale-[0.97] motion-reduce:hidden"
            >
              <RotateCw className="size-4" aria-hidden />
              Spin the phone
            </button>
            <span className="text-xs leading-5 text-white/50">
              It works like the real wallet, so tap around. The Harrington family and their nanny
              Jess are examples.
            </span>
          </figcaption>
        </figure>

        <div className="lg:self-start">
          <p className="text-sm text-white/50 lg:mt-10">Things to try</p>
          <ol className="mt-3 max-w-lg border-t border-white/10">
            {tour.map((t, n) => {
              const on = n === current;
              return (
                <li key={t.title} className="border-b border-white/10">
                  <button
                    type="button"
                    aria-current={on ? "true" : undefined}
                    aria-controls="wallet-phone"
                    onClick={() => open(t)}
                    className="group relative block w-full cursor-pointer py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    <span
                      className={cn(
                        "block text-[17px] transition-colors duration-200",
                        on
                          ? "text-white"
                          : "text-white/55 group-hover:text-white/85",
                      )}
                    >
                      {t.title}
                    </span>
                    <span
                      className={cn(
                        "mt-1 block text-sm leading-6 transition-colors duration-200",
                        on ? "text-white/70" : "text-white/40",
                      )}
                    >
                      {t.body}
                    </span>
                    {on && (
                      <span aria-hidden className="absolute inset-x-0 -bottom-px h-px bg-white" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a
              href="/demo"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-navy transition-[scale] duration-150 hover:bg-white/90 active:scale-[0.97]"
            >
              Explore the demo wallet
              <ArrowRight className="size-4" aria-hidden />
            </a>
            <a
              href="#included"
              className="text-[15px] text-white underline decoration-white/30 underline-offset-[6px] transition-colors hover:decoration-white"
            >
              Everything inside
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
