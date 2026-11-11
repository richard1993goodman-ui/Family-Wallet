import { formatDate } from "@/lib/format";
import { Link } from "@tanstack/react-router";

import { MarketingLayout, frame } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import type { Crumb } from "@/lib/landing-head";
import type { PageContent } from "@/lib/landing-content";
import { cn } from "@/lib/utils";
import { AppStorePills } from "@/components/AppStorePills";

function prettyDate(iso: string) {
  return formatDate(`${iso}T00:00:00Z`, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Renders one landing page or guide. All the words come from landing-content.ts. */
export function MarketingPage({ content, crumbs }: { content: PageContent; crumbs: Crumb[] }) {
  return (
    <MarketingLayout>
      <main className={cn(frame, "pb-20 pt-10 lg:pt-14")}>
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap gap-x-2">
            {crumbs.map((c, i) => (
              <li key={c.path} className="flex gap-x-2">
                {i > 0 && <span aria-hidden>/</span>}
                {i === crumbs.length - 1 ? (
                  <span aria-current="page">{c.name}</span>
                ) : (
                  <a href={c.path} className="underline-offset-4 hover:text-foreground hover:underline">
                    {c.name}
                  </a>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className={cn("mt-8 grid gap-10", content.image && "lg:grid-cols-12 lg:items-center lg:gap-12")}>
          <div className={cn(content.image && "lg:col-span-7")}>
            <h1 className="heading-serif max-w-3xl text-balance text-[2.5rem] leading-[1.05] text-foreground sm:text-[3.5rem]">
              {content.h1}
            </h1>
            <p className="mt-6 max-w-[40rem] text-pretty text-lg leading-relaxed text-foreground sm:text-xl">
              {content.intro}
            </p>
            {content.article && (
              <p className="mt-4 text-sm text-muted-foreground">
                Updated {prettyDate(content.article.modified)}
              </p>
            )}
            {!content.article && (
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <a href={content.cta.to}>{content.cta.label}</a>
                </Button>
                <AppStorePills />
              </div>
            )}
          </div>
          {content.image && (
            <figure className="lg:col-span-5">
              <img
                src={content.image.src}
                alt={content.image.alt}
                width={1200}
                height={900}
                fetchPriority="high"
                className="aspect-[4/3] w-full rounded-2xl object-cover"
              />
            </figure>
          )}
        </div>

        <article className="mt-16 max-w-[42rem] space-y-12">
          {content.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="heading-serif text-balance text-[1.75rem] leading-tight text-foreground sm:text-[2rem]">
                {s.heading}
              </h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="mt-4 text-[1.0625rem] leading-relaxed text-foreground">
                  {p}
                </p>
              ))}
              {s.table && (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[22rem] border-collapse text-left text-[0.9375rem]">
                    <caption className="pb-2 text-left text-sm text-muted-foreground">{s.table.caption}</caption>
                    <thead>
                      <tr className="border-b border-border">
                        {s.table.head.map((h) => (
                          <th key={h} scope="col" className="py-2 pr-4 font-semibold text-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((r) => (
                        <tr key={r.join("|")} className="border-b border-border/60">
                          {r.map((cell, i) => (
                            <td key={`${cell}-${i}`} className="py-2.5 pr-4 text-foreground">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {s.bullets && (
                <ul className="mt-4 space-y-2.5">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-[1.0625rem] leading-relaxed text-foreground">
                      <span aria-hidden className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-brand" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <section className="mt-16 max-w-[42rem]" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="heading-serif text-[1.75rem] leading-tight text-foreground sm:text-[2rem]">
            Questions
          </h2>
          <div className="mt-5 divide-y divide-border border-y border-border">
            {content.faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[1.0625rem] font-medium text-foreground">
                  {f.q}
                  <span aria-hidden className="mt-1 text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[1rem] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-2xl bg-ink-band p-8 text-white sm:p-10">
          <h2 className="heading-serif max-w-2xl text-balance text-[1.75rem] leading-tight sm:text-[2.25rem]">
            {content.cta.heading}
          </h2>
          <p className="mt-3 max-w-xl text-white/80">{content.cta.body}</p>
          <Button size="lg" className="mt-6 bg-white text-ink-band hover:bg-white/90" asChild>
            <a href={content.cta.to}>{content.cta.label}</a>
          </Button>
        </section>

        <section className="mt-14 max-w-[42rem]" aria-label="Related pages">
          <h2 className="text-sm font-semibold text-foreground">Keep reading</h2>
          <ul className="mt-3 space-y-2">
            {content.related.map((r) => (
              <li key={r.to}>
                <a href={r.to} className="text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {content.sources && (
          <section className="mt-10 max-w-[42rem]" aria-label="Sources">
            <h2 className="text-sm font-semibold text-foreground">Sources and further reading</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {content.sources.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              This guide is general information for families in the UK. It is not legal or tax advice, and rules change,
              so check GOV.UK or ask a professional about your own situation.
            </p>
          </section>
        )}
      </main>
    </MarketingLayout>
  );
}
