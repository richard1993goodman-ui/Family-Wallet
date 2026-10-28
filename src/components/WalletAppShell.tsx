import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ComponentType, ReactNode } from "react";
import {
  BadgeCheck,
  Camera,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Calculator,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  ExternalLink,
  FileBarChart,
  FileText,
  Gift,
  Handshake,
  Home,
  Landmark,
  Library,
  LifeBuoy,
  Menu,
  MessageCircle,
  NotebookPen,
  Pill,
  Plane,
  ScrollText,
  ShieldCheck,
  Siren,
  Sparkles,
  UserPlus,
  Users,
  UtensilsCrossed,
  WandSparkles,
} from "lucide-react";

import { getWalletSummary } from "@/lib/wallet.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

type WalletPath =
  | "/w/$slug"
  | "/planner/$slug"
  | "/log/$slug"
  | "/report/$slug"
  | "/emergency/$slug"
  | "/family/$slug"
  | "/nannies/$slug"
  | "/guide/$slug"
  | "/agreement/$slug"
  | "/timesheets/$slug"
  | "/leave/$slug"
  | "/handover/$slug"
  | "/medication/$slug"
  | "/travel/$slug"
  | "/passport/$slug"
  | "/cover/$slug"
  | "/payroll/$slug"
  | "/costs/$slug"
  | "/curation/$slug"
  | "/perks/$slug"
  | "/playbooks/$slug"
  | "/support/$slug"
  | "/checkin/$slug"
  | "/training/$slug"
  | "/safety/$slug"
  | "/terms/$slug"
  | "/welcome/$slug"
  | "/moments/$slug";

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to?: WalletPath;
  href?: string;
  parentOnly?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const walletPrefixes = new Set([
  "w",
  "planner",
  "log",
  "report",
  "emergency",
  "family",
  "nannies",
  "guide",
  "agreement",
  "timesheets",
  "leave",
  "handover",
  "medication",
  "travel",
  "passport",
  "cover",
  "payroll",
  "costs",
  "curation",
  "perks",
  "playbooks",
  "support",
  "checkin",
  "training",
  "safety",
  "terms",
  "welcome",
  "moments",
]);

const navGroups: NavGroup[] = [
  {
    label: "Today",
    items: [
      { label: "Home", icon: Home, to: "/w/$slug" },
      { label: "Calendar", icon: CalendarDays, to: "/planner/$slug" },
      { label: "Daily log", icon: NotebookPen, to: "/log/$slug" },
      { label: "Friday report", icon: FileBarChart, to: "/report/$slug" },
      { label: "Medication log", icon: Pill, to: "/medication/$slug" },
      { label: "Travel pack", icon: Plane, to: "/travel/$slug" },
      { label: "Photo moments", icon: Camera, to: "/moments/$slug" },
    ],
  },
  {
    label: "Family",
    items: [
      { label: "First 48 hours", icon: Sparkles, to: "/welcome/$slug" },
      { label: "Emergency card", icon: Siren, to: "/emergency/$slug" },
      { label: "Children & routines", icon: Users, to: "/family/$slug", parentOnly: true },
      { label: "Your nannies", icon: UserPlus, to: "/nannies/$slug", parentOnly: true },
      { label: "Nanny quick guide", icon: BookOpen, to: "/guide/$slug", parentOnly: true },
      { label: "Active Kids Passport", icon: Dumbbell, to: "/passport/$slug" },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Nanny agreement", icon: FileText, to: "/agreement/$slug" },
      { label: "Timesheets", icon: Clock3, to: "/timesheets/$slug" },
      { label: "Holiday & leave", icon: Plane, to: "/leave/$slug" },
      { label: "Handover & expenses", icon: ClipboardCheck, to: "/handover/$slug" },
      { label: "Membership terms", icon: ScrollText, to: "/terms/$slug", parentOnly: true },
    ],
  },
  {
    label: "Membership",
    items: [
      { label: "Request cover", icon: LifeBuoy, to: "/cover/$slug", parentOnly: true },
      { label: "Payroll setup", icon: Landmark, to: "/payroll/$slug", parentOnly: true },
      { label: "Employment costs", icon: Calculator, to: "/costs/$slug", parentOnly: true },
      { label: "Private nanny curation", icon: Handshake, to: "/curation/$slug", parentOnly: true },
      { label: "VIP member perks", icon: Gift, to: "/perks/$slug", parentOnly: true },
      { label: "Seasonal playbooks", icon: Library, to: "/playbooks/$slug" },
    ],
  },
  {
    label: "Help & training",
    items: [
      { label: "Ask Athlete Mannies", icon: MessageCircle, to: "/support/$slug" },
      { label: "Reviews & check-ins", icon: CalendarCheck, to: "/checkin/$slug" },
      { label: "Nanny training", icon: BadgeCheck, to: "/training/$slug" },
      { label: "Safety records", icon: ShieldCheck, to: "/safety/$slug" },
      { label: "Nanny Fuel", icon: UtensilsCrossed, href: "https://nanny-nourish-guide.lovable.app" },
      { label: "Activity guide", icon: WandSparkles, href: "https://nannyguide.lovable.app" },
    ],
  },
];

function getWalletLocation(pathname: string) {
  const [prefix, slug] = pathname.split("/").filter(Boolean);
  if (!prefix || !slug || !walletPrefixes.has(prefix)) return null;
  return { prefix, slug };
}

function routePrefix(to: WalletPath) {
  return to.split("/")[1] ?? "";
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

  if (!location || !summaryQuery.data?.unlocked) return <>{children}</>;

  return (
    <SidebarProvider>
      <WalletNavigation
        slug={location.slug}
        familyName={summaryQuery.data.wallet.familyName}
        isNanny={summaryQuery.data.wallet.access === "nanny"}
        activePrefix={location.prefix}
      />
      <SidebarInset className="min-w-0 bg-sand">
        <WalletTopBar familyName={summaryQuery.data.wallet.familyName} agencyName={summaryQuery.data.wallet.agencyName ?? null} />
        <div className="min-w-0 flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
        <MobileTabs
          slug={location.slug}
          isNanny={summaryQuery.data.wallet.access === "nanny"}
          activePrefix={location.prefix}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}

function WalletTopBar({ familyName, agencyName }: { familyName: string; agencyName: string | null }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      <SidebarTrigger className="h-9 w-9" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{familyName}</p>
        <p className="text-xs text-muted-foreground">Family Vault</p>
      </div>
      <span className="ml-auto hidden items-center gap-1.5 text-xs font-medium text-muted-foreground sm:flex">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        {agencyName ? <>{agencyName} · Powered by Athlete Mannies</> : <>Athlete Mannies &amp; Nannies</>}
      </span>
    </header>
  );
}

function WalletNavigation({
  slug,
  familyName,
  isNanny,
  activePrefix,
}: {
  slug: string;
  familyName: string;
  isNanny: boolean;
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
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-sidebar-primary font-display text-sm font-semibold text-sidebar-primary-foreground">
            AM
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-semibold">{familyName}</span>
            <span className="block text-xs text-sidebar-foreground/65">Family Vault</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-2">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => !item.parentOnly || !isNanny);
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      {item.to ? (
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
                      ) : (
                        <SidebarMenuButton asChild tooltip={item.label}>
                          <a href={item.href} target="_blank" rel="noopener noreferrer">
                            <item.icon />
                            <span>{item.label}</span>
                            <ExternalLink className="ml-auto h-3 w-3" />
                          </a>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-3">
        <p className="px-2 text-xs leading-relaxed text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          {isNanny ? "Nanny access" : "Family membership"} · Private and secure
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function MobileTabs({ slug, isNanny, activePrefix }: { slug: string; isNanny: boolean; activePrefix: string }) {
  const { toggleSidebar } = useSidebar();
  const tabs = [
    { label: "Home", icon: Home, to: "/w/$slug" as const, prefixes: ["w"] },
    { label: "Calendar", icon: CalendarDays, to: "/planner/$slug" as const, prefixes: ["planner"] },
    {
      label: "Family",
      icon: Users,
      to: (isNanny ? "/guide/$slug" : "/family/$slug") as "/guide/$slug" | "/family/$slug",
      prefixes: ["family", "nannies", "guide", "emergency"],
    },
    { label: "Documents", icon: FileText, to: "/agreement/$slug" as const, prefixes: ["agreement", "terms", "safety"] },
  ];

  return (
    <nav
      aria-label="Vault navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_var(--foreground)] backdrop-blur md:hidden"
    >
      <div className="grid h-16 grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.prefixes.includes(activePrefix);
          return (
            <Link
              key={tab.label}
              to={tab.to}
              params={{ slug }}
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
          aria-label="Open all vault pages"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </Button>
      </div>
    </nav>
  );
}