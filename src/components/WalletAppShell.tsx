import { SectionContext } from "@/components/section-context";
import { staffNoun } from "@/lib/staff-roles";
import { readDemoBrand } from "@/lib/demo-brand";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Lock, LogOut, Menu, Search } from "lucide-react";

import { LogoMark, Wordmark } from "@/components/brand";
import { HouseholdSwitcher } from "@/components/HouseholdSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { PresenceAvatars } from "@/components/PresenceAvatars";
import { TransitionBanner } from "@/components/TransitionBanner";
import { AccountMenu, QuickAddMenu, useLogout } from "@/components/HeaderMenus";

import { getBadges, markSeenFn } from "@/lib/notifications.functions";
import { getWalletSummary } from "@/lib/wallet.functions";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import {
  mobileTabsFor,
  navFor,
  routePrefix,
  sectionFor,
  sectionTint,
  walletPrefixes,
  type WalletRole,
} from "@/components/wallet-nav";
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
/** What the household calls its staff in the menu: "nanny", "au pair", "staff". */
const StaffNounContext = createContext("nanny");

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
  const totalUnseen = Object.entries(badges).reduce(
    (sum, [key, n]) => (key === onPage ? sum : sum + n),
    0,
  );
  useEffect(() => {
    // The app-icon badge on installed phones; a no-op where the Badging API is missing.
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
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
  const noun0 = staffNoun(wallet.nannies.map((n) => n.role));
  const activeSection =
    location.prefix === "w"
      ? null
      : sectionFor(role, location.prefix, wallet.agreementsEnabled, noun0);
  const sectionValue = activeSection
    ? { label: activeSection.label, tint: sectionTint(activeSection.label) }
    : null;
  const agencyName: string | null = null;
  const agencyLogo: string | null = null;

  return (
    <BadgeContext.Provider value={badges}>
      <AgreementsContext.Provider value={wallet.agreementsEnabled}>
        <StaffNounContext.Provider value={staffNoun(wallet.nannies.map((n) => n.role))}>
          <SidebarProvider>
            <WalletNavigation
              slug={location.slug}
              role={role}
              agencyName={agencyName}
              agencyLogo={agencyLogo}
              activePrefix={location.prefix}
            />
            <SidebarInset
              data-tint={sectionValue?.tint}
              className="min-w-0 bg-background md:border md:border-sidebar-border md:shadow-none"
            >
              <SectionContext.Provider value={sectionValue}>
                <TransitionBanner slug={location.slug} />
                <WalletTopBar
                  slug={location.slug}
                  familyName={wallet.familyName}
                  role={role}
                  agencyName={agencyName}
                  agencyLogo={agencyLogo}
                  onSearch={() => setSearchOpen(true)}
                />
                <SectionNav slug={location.slug} role={role} activePrefix={location.prefix} />
                <div className="tint-wash min-w-0 flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
                  {children}
                </div>
                <MobileTabs slug={location.slug} role={role} activePrefix={location.prefix} />
              </SectionContext.Provider>
            </SidebarInset>
            <WalletSearch
              slug={location.slug}
              role={role}
              open={searchOpen}
              onOpenChange={setSearchOpen}
            />
          </SidebarProvider>
        </StaffNounContext.Provider>
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
  const t = useT();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:rounded-t-xl md:px-8">
      {/* On a phone every page is under the More tab, so the side drawer is desktop-only. */}
      <SidebarTrigger className="-ml-1 hidden h-9 w-9 text-muted-foreground hover:text-foreground md:inline-flex" />
      {agencyLogo ? (
        <img
          src={agencyLogo}
          alt={`${agencyName ?? "Agency"} logo`}
          className="h-7 w-auto max-w-[6rem] flex-none object-contain md:hidden"
        />
      ) : slug === "demo" ? (
        <LogoMark className="h-6 w-6 md:hidden" />
      ) : null}
      {/* The wallet belongs to the household: parents and staff both use it, and the avatars show who is in. */}
      <div className="flex min-w-0 items-baseline gap-2">
        <HouseholdSwitcher slug={slug} familyName={familyName} />
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="ml-auto flex h-9 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground md:w-72"
        aria-label={t("shell.searchWallet")}
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">{t("shell.goToPage")}</span>
        <kbd className="ml-auto hidden rounded-sm bg-accent px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground md:inline">
          ⌘K
        </kbd>
      </button>
      <QuickAddMenu slug={slug} />
      <NotificationBell slug={slug} />
      <PresenceAvatars slug={slug} />
      <AccountMenu
        slug={slug}
        familyName={familyName}
        roleLabel={role === "nanny" ? t("shell.signedInStaff") : t("shell.signedInParent")}
      />
      {slug === "demo" && (
        <Link
          to="/"
          className="flex h-9 flex-none items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <LogOut className="h-4 w-4" aria-hidden />{" "}
          <span className="hidden sm:inline">{t("shell.exitDemo")}</span>
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
  const t = useT();
  const agreements = useContext(AgreementsContext);
  const noun = useContext(StaffNounContext);
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-sidebar-border">
      {
        <SidebarHeader className="px-3 pb-2 pt-4">
          <Link
            to="/w/$slug"
            params={{ slug }}
            onClick={() => isMobile && setOpenMobile(false)}
            className="flex min-w-0 items-center rounded-md px-1.5 py-1.5 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:px-0"
          >
            <Wordmark
              subline={
                slug === "demo"
                  ? t("shell.demoWallet")
                  : agencyName
                    ? t("shell.withAgency", { agency: agencyName })
                    : null
              }
              logoUrl={agencyLogo}
              logoAlt={agencyName ? `${agencyName} logo` : "Agency logo"}
              className="group-data-[collapsible=icon]:[&>span:last-child]:hidden"
            />
          </Link>
        </SidebarHeader>
      }
      <SidebarContent className="gap-1 py-2">
        {navFor(role, agreements, noun, t).map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel
              data-tint={sectionTint(section.label)}
              className="gap-2 text-[0.8125rem] font-medium text-foreground/80"
            >
              <span className="tint-dot" aria-hidden />
              {section.title ?? section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={activePrefix === routePrefix(item.to)}
                      tooltip={item.title ?? item.label}
                      className="h-11 text-[0.9375rem] text-sidebar-foreground transition-colors md:h-8 md:text-sm [&>svg]:text-muted-foreground data-[active=true]:bg-card data-[active=true]:ring-1 data-[active=true]:ring-sidebar-border data-[active=true]:[&>svg]:text-brand"
                    >
                      <Link
                        to={item.to}
                        params={{ slug }}
                        onClick={() => isMobile && setOpenMobile(false)}
                        preload="intent"
                      >
                        <item.icon />
                        <span>{item.title ?? item.label}</span>
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
          Private to your household
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SidebarLogout({ slug }: { slug: string }) {
  const t = useT();
  const logout = useLogout(slug);
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={slug === "demo" ? t("shell.exitDemo") : t("shell.lockLogout")}
          onClick={() => void logout()}
          className="h-11 text-[0.9375rem] text-sidebar-foreground md:h-8 md:text-sm [&>svg]:text-muted-foreground"
        >
          <LogOut />
          <span>{slug === "demo" ? t("shell.exitDemo") : t("shell.lockLogout")}</span>
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
  const t = useT();
  const agreements = useContext(AgreementsContext);
  const noun = useContext(StaffNounContext);
  const section = activePrefix === "w" ? null : sectionFor(role, activePrefix, agreements, noun);
  if (!section || section.items.length < 2) return null;

  return (
    <nav
      aria-label={section.title ?? section.label}
      className="border-b border-border bg-background print:hidden"
    >
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
              {item.title ?? item.label}
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
  const t = useT();
  const agreements = useContext(AgreementsContext);
  const noun = useContext(StaffNounContext);
  const navigate = useNavigate();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">{t("shell.searchWallet")}</DialogTitle>
      <CommandInput placeholder={t("shell.searchPlaceholder")} />
      <CommandList>
        <CommandEmpty>{t("shell.noPages")}</CommandEmpty>
        {navFor(role, agreements, noun, t).map((section) => (
          <CommandGroup key={section.label} heading={section.title ?? section.label}>
            {section.items.map((item) => (
              <CommandItem
                key={item.to}
                value={`${item.title ?? item.label} ${item.label}`}
                keywords={item.keywords ?? []}
                onSelect={() => {
                  onOpenChange(false);
                  void navigate({ to: item.to, params: { slug } });
                }}
              >
                <item.icon className="text-muted-foreground" />
                {item.title ?? item.label}
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
  const t = useT();
  const agreements = useContext(AgreementsContext);
  const noun = useContext(StaffNounContext);
  const currentSection =
    activePrefix === "w" ? "Home" : sectionFor(role, activePrefix, agreements, noun)?.label;

  return (
    <nav
      aria-label={t("shell.navLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid h-16 grid-cols-5">
        {mobileTabsFor(role, t).map((tab) => {
          const active = tab.label === currentSection;
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
              <span className="truncate">{tab.title ?? tab.label}</span>
              <NavBadge prefix={routePrefix(tab.to)} className="absolute right-[18%] top-1.5" />
            </Link>
          );
        })}
        <Link
          to="/more/$slug"
          params={{ slug }}
          aria-current={currentSection === "More" ? "page" : undefined}
          className={cn(
            "relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors",
            currentSection === "More" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <Menu className={cn("h-5 w-5", currentSection === "More" ? "stroke-[2]" : "stroke-[1.5]")} />
          <span>{t("shell.more")}</span>
        </Link>
      </div>
    </nav>
  );
}
