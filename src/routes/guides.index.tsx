import { createFileRoute } from "@tanstack/react-router";

import { MarketingLayout, frame } from "@/components/MarketingLayout";
import { GUIDE_LIST } from "@/lib/landing-content";
import { breadcrumbLd, pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/guides/")({
  head: () =>
    pageHead({
      title: "Guides for Families Who Employ a Nanny | Family Wallet",
      description:
        "Plain-English guides for UK families who employ a nanny or other household staff: contracts, costs and running the week.",
      path: "/guides",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
        ]),
      ],
    }),
  component: GuidesIndex,
});

function GuidesIndex() {
  return (
    <MarketingLayout>
      <main className={cn(frame, "pb-24 pt-14")}>
        <h1 className="heading-serif max-w-3xl text-balance text-[2.5rem] leading-[1.05] text-foreground sm:text-[3.5rem]">
          Guides for families who employ a nanny
        </h1>
        <p className="mt-6 max-w-[38rem] text-lg leading-relaxed text-foreground">
          Practical, plain-English help for running a household team, written for UK families.
        </p>
        <ul className="mt-12 max-w-[42rem] divide-y divide-border border-y border-border">
          {GUIDE_LIST.map((g) => (
            <li key={g.slug} className="py-6">
              <a href={g.path} className="group block">
                <span className="heading-serif text-[1.5rem] leading-tight text-foreground group-hover:underline group-hover:underline-offset-4">
                  {g.h1}
                </span>
                <span className="mt-2 block text-[1rem] leading-relaxed text-muted-foreground">{g.description}</span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </MarketingLayout>
  );
}
