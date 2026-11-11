import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const frame = "mx-auto w-full max-w-[84rem] px-4 sm:px-8";

const nav = [
  { label: "Nanny app", to: "/nanny-management-app" },
  { label: "Household staff", to: "/household-staff-app" },
  { label: "For agencies", to: "/for-agencies" },
  { label: "Guides", to: "/guides" },
  { label: "Pricing", to: "/pricing" },
] as const;

/** Header and footer for the public, search-facing pages. */
export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh overflow-x-clip bg-background">
      <header className="border-b border-border/70">
        <div className={cn(frame, "flex h-16 items-center justify-between gap-6")}>
          <Link to="/" className="heading-serif text-[1.375rem] leading-none text-foreground">
            The Family Wallet
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-[0.9375rem] lg:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Button asChild>
            <Link to="/login">Open my wallet</Link>
          </Button>
        </div>
      </header>
      {children}
      <footer className="border-t border-border/70 pb-12 pt-12">
        <div className={cn(frame, "grid gap-10 sm:grid-cols-2 lg:grid-cols-4")}>
          <div>
            <p className="heading-serif text-xl text-foreground">The Family Wallet</p>
            <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
              A private app for families who employ a nanny, au pair or household staff.
            </p>
          </div>
          <FooterList
            title="Product"
            links={[
              { label: "Nanny management app", to: "/nanny-management-app" },
              { label: "Household staff app", to: "/household-staff-app" },
              { label: "Pricing", to: "/pricing" },
              { label: "Demo wallet", to: "/demo" },
            ]}
          />
          <FooterList
            title="For agencies"
            links={[
              { label: "Family app for agencies", to: "/for-agencies" },
              { label: "Agency plans", to: "/pricing?for=agencies" },
              { label: "Agency sign in", to: "/auth" },
            ]}
          />
          <FooterList
            title="Guides"
            links={[
              { label: "Nanny contract UK", to: "/guides/nanny-contract-uk" },
              { label: "What a nanny costs", to: "/guides/how-much-does-a-nanny-cost-uk" },
              { label: "All guides", to: "/guides" },
            ]}
          />
        </div>
        <div className={cn(frame, "mt-10 text-xs text-muted-foreground")}>
          © 2026 The Family Wallet. Built in London. Guides are general information, not legal or tax advice.
        </div>
      </footer>
    </div>
  );
}

function FooterList({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <a href={l.to} className="text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
