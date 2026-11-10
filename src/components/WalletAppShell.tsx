import { readDemoBrand } from "@/lib/demo-brand";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Lock, LogOut, Menu, Search } from "lucide-react";

import { LogoMark, Wordmark } from "@/components/brand";
import { NotificationBell } from "@/components/NotificationBell";
import { AccountMenu, QuickAddMenu, useLogout } from "@/components/HeaderMenus";

import { getBadges, markSeenFn } from "@/lib/notifications.functions";
import { getWalletSummary } from "@/lib/wallet.functions";
import { cn } from "@/lib/utils";
import {
  mobileTabsFor,
  navFor,
  routePrefix,
  sectionFor,
  walletPrefixes,
  type WalletRole,
} from "@/components/wallet-nav";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DialogTitle } from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

function getWalletLocation(pathname: string) {
  const [prefix, slug] = pathname.split("/").filter(Boolean);
  if (!prefix || !slug || !walletPrefixes.has(prefix)) return null;
  return { prefix, slug };
}

/** Unread counts keyed by page route prefix, shared with every nav component below. */
const BadgeContext = createContext<Record<string, number>>({});
/** False when this household has chosen not to use the nanny agreement. */
const AgreementsContext = createContext(true);

function NavBadge({ prefix, className }: { prefix: string; className?: string }) {
  const count = useContext(BadgeContext)[prefix] ?? 0;
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "num flex h-5 min-w-5 items-center justify-center rounded-full bg-tint-apricot px-1.5 text-[0.6875rem] font-semibold text-tint-apricot-ink",
        className,
      )}
    >
      <span className="sr-only">{count} new: </span>
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function WalletAppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const location = getWalletLocation(pathname);
  const summaryFn = useServerFn(getWalletSummary);
  const summaryQuery = useQuery({
    queryKey: ["wallet", location?.slug ?? "not-a-wallet"],
    queryFn: () => summaryFn({ data: { slug: location?.slug ?? "" } }),
    enabled: Boolean(location),
  });

  const [demoBrand, setDemoBrandState] = useState<string | null>(null);
  useEffect(() => {
    setDemoBrandState(location?.slug === "demo" ? readDemoBrand() : null);
  }, [location?.slug]);

  const [searchOpen, setSearchOpen] = useState(false);
  const unlocked = Boolean(location && summaryQuery.data?.unlocked);

  // Unread badges: what the other person changed since you last opened each page. The demo wallet has none.
  const queryClient = useQueryClient();
  const badgesFn = useServerFn(getBadges);
  const seenFn = useServerFn(markSeenFn);
  const badgeSlug = location?.slug ?? "";
  const badgeQuery = useQuery({
    queryKey: ["badges", badgeSlug],
    queryFn: () => badgesFn({ data: { slug: badgeSlug } }),
    enabled: unlocked && badgeSlug !== "demo",
    refetchInterval: 60_000,
  });
  const badges = badgeQuery.data ?? {};
  const onPage = location?.prefix ?? "";
  const unseenHere = badges[onPage] ?? 0;
  useEffect(() => {
    // Opening a page (or new activity arriving while you are on it) counts as seeing it.
    if (!unlocked || badgeSlug === "demo") return;
    void seenFn({ data: { slug: badgeSlug, feature: onPage } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["badges", badgeSlug] }))
      .catch(() => undefined);
  }, [unlocked, badgeSlug, onPage, unseenHere, seenFn, queryClient]);
  const totalUnseen = Object.entries(badges).reduce((sum, [key, n]) => (key === onPage ? sum : sum + n), 0);
  useEffect(() => {
    // The app-icon badge on installed phones; a no-op where the Badging API is missing.
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (totalUnseen > 0) void nav.setAppBadge?.(totalUnseen).catch(() => undefined);
    else void nav.clearAppBadge?.().catch(() => undefined);
  }, [totalUnseen]);
  useEffect(() => {
    if (!unlocked) return;
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlocked]);

  if (!location || !summaryQuery.data?.unlocked) return <>{children}</>;

  const wallet = summaryQuery.data.wallet;
  const role: WalletRole = wallet.access === "nanny" ? "nanny" : "family";
  const agencyName = demoBrand ?? wallet.agencyName ?? null;
  const agencyLogo = location.slug === "demo" ? null : wallet.agencyLogo ?? null;

  return (
    <BadgeContext.Provider value={badges}>
    <AgreementsContext.Provider value={wallet.agreementsEnabled}>
    <SidebarProvider>
      <WalletNavigation
        slug={location.slug}
        role={role}
        agencyName={agencyName}
        agencyLogo={agencyLogo}
        activePrefix={location.prefix}
      />
      <SidebarInset className="min-w-0 bg-background md:border md:border-sidebar-border md:shadow-none">
        <WalletTopBar
          slug={location.slug}
          familyName={wallet.familyName}
          role={role}
          agencyName={agencyName}
          agencyLogo={agencyLogo}
          onSearch={() => setSearchOpen(true)}
        />
        <SectionNav slug={location.slug} role={role} activePrefix={location.prefix} />
        <div className="min-w-0 flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
        <MobileTabs slug={location.slug} role={role} activePrefix={location.prefix} />
      </SidebarInset>
      <WalletSearch
        slug={location.slug}
        role={role}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
    </SidebarProvider>
    </AgreementsContext.Provider>
    </BadgeContext.Provider>
  );
}

function WalletTopBar({
  slug,
  familyName,
  role,
  agencyName,
  agencyLogo,
  onSearch,
}: {
  slug: string;
  familyName: string;
  role: WalletRole;
  agencyName: string | null;
  agencyLogo: string | null;
  onSearch: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:rounded-t-xl md:px-8">
      <SidebarTrigger className="-ml-1 h-9 w-9 text-muted-foreground hover:text-foreground" />
      {agencyLogo ? (
        <img
          src={agencyLogo}
          alt={`${agencyName ?? "Agency"} logo`}
          className="h-7 w-auto max-w-[6rem] flex-none object-contain md:hidden"
        />
      ) : slug === "demo" ? (
        <LogoMark className="h-6 w-6 md:hidden" />
      ) : null}
      <div className="flex min-w-0 items-baseline gap-2">
        <p className="truncate text-sm font-medium text-foreground">{familyName}</p>
        <p className="hidden truncate text-sm text-muted-foreground sm:block">
          {role === "nanny" ? "Nanny access" : "Parent access"}
        </p>
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="ml-auto flex h-9 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground md:w-72"
        aria-label="Search the wallet"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Go to a page</span>
        <kbd className="ml-auto hidden rounded-sm bg-accent px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground md:inline">
          ⌘K
        </kbd>
      </button>
      <QuickAddMenu slug={slug} />
      <NotificationBell slug={slug} />
      <AccountMenu
        slug={slug}
        familyName={familyName}
        roleLabel={role === "nanny" ? "Nanny access" : "Parent access"}
      />
      {slug === "demo" && (
        <Link
          to="/"
          className="flex h-9 flex-none items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Exit demo</span>
        </Link>
      )}
    </header>
  );
}

function WalletNavigation({
  slug,
  role,
  agencyName,
  agencyLogo,
  activePrefix,
}: {
  slug: string;
  role: WalletRole;
  agencyName: string | null;
  agencyLogo: string | null;
  activePrefix: string;
}) {
  const agreements = useContext(AgreementsContext);
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-sidebar-border">
      {(
      <SidebarHeader className="px-3 pb-2 pt-4">
        <Link
            to="/w/$slug"
            params={{ slug }}
            onClick={() => isMobile && setOpenMobile(false)}
            className="flex min-w-0 items-center rounded-md px-1.5 py-1.5 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:px-0"
          >
            <Wordmark
              subline={slug === "demo" ? "Demo wallet" : agencyName ? `with ${agencyName}` : null}
              logoUrl={agencyLogo}
              logoAlt={agencyName ? `${agencyName} logo` : "Agency logo"}
              className="group-data-[collapsible=icon]:[&>span:last-child]:hidden"
            />
          </Link>
      </SidebarHeader>
      )}
      <SidebarContent className="gap-1 py-2">
        {navFor(role, agreements).map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[0.8125rem] font-normal text-muted-foreground">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={activePrefix === routePrefix(item.to)}
                      tooltip={item.label}
                      className="h-11 text-[0.9375rem] text-sidebar-foreground transition-colors md:h-8 md:text-sm [&>svg]:text-muted-foreground data-[active=true]:bg-card data-[active=true]:ring-1 data-[active=true]:ring-sidebar-border data-[active=true]:[&>svg]:text-brand"
                    >
                      <Link
                        to={item.to}
                        params={{ slug }}
                        onClick={() => isMobile && setOpenMobile(false)}
                        preload="intent"
                      >
                        <item.icon />
                        <span>{item.label}</span>
                        <NavBadge prefix={routePrefix(item.to)} className="ml-auto" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-3">
        <SidebarLogout slug={slug} />
        <p className="flex items-center gap-2 px-2 text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">
          <Lock className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
          {role === "nanny" ? "Nanny access" : "Parent access"} · Private to your household
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SidebarLogout({ slug }: { slug: string }) {
  const logout = useLogout(slug);
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={slug === "demo" ? "Exit demo" : "Lock & log out"}
          onClick={() => void logout()}
          className="h-11 text-[0.9375rem] text-sidebar-foreground md:h-8 md:text-sm [&>svg]:text-muted-foreground"
        >
          <LogOut />
          <span>{slug === "demo" ? "Exit demo" : "Lock & log out"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** Sibling pages in the current nav section, so related pages are one tap apart. */
function SectionNav({
  slug,
  role,
  activePrefix,
}: {
  slug: string;
  role: WalletRole;
  activePrefix: string;
}) {
  const agreements = useContext(AgreementsContext);
  const section = activePrefix === "w" ? null : sectionFor(role, activePrefix, agreements);
  if (!section || section.items.length < 2) return null;

  return (
    <nav aria-label={section.label} className="border-b border-border bg-background print:hidden">
      <div className="flex gap-6 overflow-x-auto px-4 [scrollbar-width:none] md:px-8">
        {section.items.map((item) => {
          const active = routePrefix(item.to) === activePrefix;
          return (
            <Link
              key={item.to}
              to={item.to}
              params={{ slug }}
              preload="intent"
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex h-11 flex-none items-center gap-1.5 border-b-2 text-sm transition-colors",
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              <NavBadge prefix={routePrefix(item.to)} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function WalletSearch({
  slug,
  role,
  open,
  onOpenChange,
}: {
  slug: string;
  role: WalletRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const agreements = useContext(AgreementsContext);
  const navigate = useNavigate();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Search the wallet</DialogTitle>
      <CommandInput placeholder="Where do you want to go?" />
      <CommandList>
        <CommandEmpty>No matching pages.</CommandEmpty>
        {navFor(role, agreements).map((section) => (
          <CommandGroup key={section.label} heading={section.label}>
            {section.items.map((item) => (
              <CommandItem
                key={item.to}
                value={item.label}
                keywords={item.keywords ?? []}
                onSelect={() => {
                  onOpenChange(false);
                  void navigate({ to: item.to, params: { slug } });
                }}
              >
                <item.icon className="text-muted-foreground" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

function MobileTabs({
  slug,
  role,
  activePrefix,
}: {
  slug: string;
  role: WalletRole;
  activePrefix: string;
}) {
  const agreements = useContext(AgreementsContext);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav
      aria-label="Wallet navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid h-16 grid-cols-5">
        {mobileTabsFor(role).map((tab) => {
          const active = routePrefix(tab.to) === activePrefix;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              params={{ slug }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <tab.icon className={cn("h-5 w-5", active ? "stroke-[2]" : "stroke-[1.5]")} />
              <span className="truncate">{tab.label}</span>
              <NavBadge prefix={routePrefix(tab.to)} className="absolute right-[18%] top-1.5" />
            </Link>
          );
        })}
        <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
          <DrawerTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-full min-w-0 flex-col gap-1 rounded-none px-1 text-[11px] font-medium text-muted-foreground active:scale-100"
              aria-label="Open all wallet pages"
            >
              <Menu className="h-5 w-5 stroke-[1.5]" />
              <span>More</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="px-5 pb-2 pt-3 text-left">
              <DrawerTitle className="text-base">All wallet pages</DrawerTitle>
              <DrawerDescription className="sr-only">
                Every page in your Family Wallet, grouped by section.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {navFor(role, agreements).map((section) => (
                <section key={section.label} className="pt-3">
                  <h3 className="px-2 pb-1 text-[0.8125rem] font-normal text-muted-foreground">
                    {section.label}
                  </h3>
                  <ul>
                    {section.items.map((item) => {
                      const active = routePrefix(item.to) === activePrefix;
                      return (
                        <li key={item.to}>
                          <Link
                            to={item.to}
                            params={{ slug }}
                            onClick={() => setMoreOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex min-h-12 items-center gap-3 rounded-lg px-2 text-[0.9375rem] transition-colors active:bg-accent",
                              active ? "bg-accent font-medium text-foreground" : "text-foreground",
                            )}
                          >
                            <item.icon
                              className={cn(
                                "h-[1.125rem] w-[1.125rem] flex-none",
                                active ? "text-brand" : "text-muted-foreground",
                              )}
                            />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
}
