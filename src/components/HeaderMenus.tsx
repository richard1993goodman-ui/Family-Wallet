import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarPlus,
  Camera,
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
import { useT } from "@/lib/i18n/provider";
import { lockWalletFn } from "@/lib/wallet.functions";

const triggerClass =
  "flex h-9 flex-none items-center justify-center gap-1.5 rounded-md border border-input bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground";

export function QuickAddMenu({ slug }: { slug: string }) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass} aria-label={t("menu.quickAdd")}>
        <Plus className="h-4 w-4" />
        <span className="hidden lg:inline">{t("menu.add")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("menu.quickAdd")}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/planner/$slug" params={{ slug }}>
            <CalendarPlus /> {t("menu.calendarEvent")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/messages/$slug" params={{ slug }}>
            <MessageSquarePlus /> {t("menu.note")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/medication/$slug" params={{ slug }}>
            <Pill /> {t("menu.medicine")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/pettycash/$slug" params={{ slug }}>
            <Receipt /> {t("menu.expense")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function useLogout(slug: string) {
  const t = useT();
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
      toast.success(t("menu.locked"));
      navigate({ to: "/" });
    } catch {
      toast.error(t("menu.logoutError"));
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
  const t = useT();
  const logout = useLogout(slug);
  const isDemo = slug === "demo";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass} aria-label={t("menu.account")}>
        <UserRound className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{familyName}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!isDemo && (
          <DropdownMenuItem onSelect={() => document.getElementById("my-photo-input")?.click()}>
            <Camera /> {t("menu.changePhoto")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/emergency/$slug" params={{ slug }}>
            <ShieldAlert /> {t("menu.emergency")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/medication/$slug" params={{ slug }}>
            <HeartPulse /> {t("menu.health")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()} className="text-destructive focus:text-destructive">
          <LogOut /> {isDemo ? t("shell.exitDemo") : t("shell.lockLogout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
