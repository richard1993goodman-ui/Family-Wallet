import { readDemoBrand } from "@/lib/demo-brand";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Menu, Search, Wallet } from "lucide-react";

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

  return (
    <SidebarProvider>
      <WalletNavigation
        slug={location.slug}
        role={role}
        agencyName={agencyName}
        activePrefix={location.prefix}
      />
      <SidebarInset className="min-w-0 bg-sand">
        <WalletTopBar
          familyName={wallet.familyName}
          role={role}
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
  );
}

function WalletTopBar({
  familyName,
  role,
  onSearch,
}: {
  familyName: string;
  role: WalletRole;
  onSearch: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      <SidebarTrigger className="h-9 w-9" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{familyName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {role === "nanny" ? "Nanny access" : "Parent access"}
        </p>
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="ml-auto flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:text-foreground md:w-64"
        aria-label="Search the wallet"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search pages…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 font-sans text-[10px] font-medium md:inline">
          ⌘K
        </kbd>
      </button>
    </header>
  );
}

function WalletNavigation({
  slug,
  role,
  agencyName,
  activePrefix,
}: {
  slug: string;
  role: WalletRole;
  agencyName: string | null;
  activePrefix: string;
}) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <Link
          to="/w/$slug"
          params={{ slug }}
          onClick={() => isMobile && setOpenMobile(false)}
          className="flex min-w-0 items-center gap-3 rounded-md p-1.5 hover:bg-sidebar-accent"
        >
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Wallet className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate font-serif text-[0.9375rem] font-semibold">
              The Family Wallet
            </span>
            {agencyName && (
              <span className="block truncate text-xs text-sidebar-foreground/65">
                with {agencyName}
              </span>
            )}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-2">
        {navFor(role).map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={activePrefix === routePrefix(item.to)}
                      tooltip={item.label}
                    >
                      <Link
                        to={item.to}
                        params={{ slug }}
                        onClick={() => isMobile && setOpenMobile(false)}
                        preload="intent"
                      >
                        <item.icon />
                        <span>{item.label}</span>
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
        <p className="px-2 text-xs leading-relaxed text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          {role === "nanny" ? "Nanny access" : "Parent access"} · Private and secure
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
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
  const section = activePrefix === "w" ? null : sectionFor(role, activePrefix);
  if (!section || section.items.length < 2) return null;

  return (
    <nav
      aria-label={section.label}
      className="border-b border-border bg-background/60 print:hidden"
    >
      <div className="flex gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] md:px-6">
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
                "flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
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
  const navigate = useNavigate();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Search the wallet</DialogTitle>
      <CommandInput placeholder="Where do you want to go?" />
      <CommandList>
        <CommandEmpty>No matching pages.</CommandEmpty>
        {navFor(role).map((section) => (
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
  const { toggleSidebar } = useSidebar();

  return (
    <nav
      aria-label="Wallet navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_var(--foreground)] backdrop-blur md:hidden"
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
                "flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <tab.icon className={cn("h-5 w-5", active && "fill-primary/10")} />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          onClick={toggleSidebar}
          className="h-full min-w-0 flex-col gap-1 rounded-none px-1 text-[10px] font-medium text-muted-foreground"
          aria-label="Open all wallet pages"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </Button>
      </div>
    </nav>
  );
}
