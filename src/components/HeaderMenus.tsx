import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarPlus,
  HeartPulse,
  LogOut,
  MessageSquarePlus,
  Pill,
  Plus,
  Receipt,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { lockWalletFn } from "@/lib/wallet.functions";

const triggerClass =
  "flex h-9 flex-none items-center justify-center gap-1.5 rounded-md border border-input bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground";

export function QuickAddMenu({ slug }: { slug: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass} aria-label="Quick add">
        <Plus className="h-4 w-4" />
        <span className="hidden lg:inline">Add</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick add</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/planner/$slug" params={{ slug }}>
            <CalendarPlus /> Calendar event or playdate
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/messages/$slug" params={{ slug }}>
            <MessageSquarePlus /> Note or message
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/medication/$slug" params={{ slug }}>
            <Pill /> Medicine dose
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/pettycash/$slug" params={{ slug }}>
            <Receipt /> Expense
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function useLogout(slug: string) {
  const lockFn = useServerFn(lockWalletFn);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    if (slug === "demo") {
      navigate({ to: "/" });
      return;
    }
    try {
      await lockFn({ data: { slug } });
      window.localStorage.removeItem("wallet-link");
      queryClient.clear();
      toast.success("Wallet locked on this device");
      navigate({ to: "/" });
    } catch {
      toast.error("Couldn't log out. Please try again.");
    }
  };
}

export function AccountMenu({
  slug,
  familyName,
  roleLabel,
}: {
  slug: string;
  familyName: string;
  roleLabel: string;
}) {
  const logout = useLogout(slug);
  const isDemo = slug === "demo";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass} aria-label="Account and log out">
        <UserRound className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{familyName}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/emergency/$slug" params={{ slug }}>
            <ShieldAlert /> Emergency contacts
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/medication/$slug" params={{ slug }}>
            <HeartPulse /> Health &amp; medicine
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()} className="text-destructive focus:text-destructive">
          <LogOut /> {isDemo ? "Exit demo" : "Lock & log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
