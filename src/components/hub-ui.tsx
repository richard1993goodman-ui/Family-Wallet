import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ChevronRight, CloudOff, Lock, RotateCw } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { getWalletSummary } from "@/lib/wallet.functions";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Shared content column for wallet pages; they render inside WalletAppShell's sidebar layout. */
export function PageContainer({
  width = "default",
  className,
  children,
}: {
  width?: "default" | "wide" | undefined;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pb-16 pt-6 sm:px-6 md:px-8 md:pt-9",
        width === "wide" ? "max-w-6xl" : "max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  slug,
  title,
  intro,
  actions,
}: {
  slug: string;
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header>
      <nav aria-label="Breadcrumb" className="print:hidden">
        <ol className="flex items-center gap-1 text-[0.8125rem] text-muted-foreground">
          <li>
            <Link
              to="/w/$slug"
              params={{ slug }}
              className="rounded-sm transition-colors hover:text-foreground"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          </li>
          <li aria-current="page" className="truncate text-foreground">
            {title}
          </li>
        </ol>
      </nav>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="heading-display text-[1.625rem] leading-tight text-foreground md:text-[1.875rem]">
            {title}
          </h1>
          {intro && (
            <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground">
              {intro}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-none flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function HubPage({
  slug,
  title,
  intro,
  actions,
  width,
  children,
}: {
  slug: string;
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
  width?: "default" | "wide" | undefined;
  children: ReactNode;
}) {
  return (
    <PageContainer width={width}>
      <PageHeader slug={slug} title={title} intro={intro} actions={actions} />
      <div className="mt-8">{children}</div>
    </PageContainer>
  );
}

/** Only for pages outside the wallet navigation shell (e.g. printable certificates). */
export function BackToWallet({ slug }: { slug: string }) {
  return (
    <div className="mt-12 border-t border-border pt-5 print:hidden">
      <Link
        to="/w/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to wallet
      </Link>
    </div>
  );
}

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <PageContainer>
      <div role="status" aria-live="polite">
        <span className="sr-only">{label}</span>
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="mt-3 h-8 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </PageContainer>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-input bg-card px-6 py-10 text-center">
      {Icon && <Icon className="mx-auto h-5 w-5 text-muted-foreground" />}
      <p className="mt-3 font-medium text-foreground">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * Shown when a page gets no data. Pages return nothing both when the wallet is locked and
 * when the request fails, so check the wallet summary before telling people to unlock.
 */
export function LockedNotice({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const summaryFn = useServerFn(getWalletSummary);
  const summary = useQuery({
    queryKey: ["wallet", slug],
    queryFn: () => summaryFn({ data: { slug } }),
  });

  if (summary.isLoading) return <PageLoading />;

  if (summary.isError || summary.data?.unlocked) {
    return (
      <PageContainer>
        <div className="surface-card mx-auto max-w-sm p-8 text-center" role="alert">
          <CloudOff className="mx-auto h-5 w-5 text-muted-foreground" />
          <h1 className="heading-display mt-4 text-2xl text-foreground">This page didn't load</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your wallet is safe — we just couldn't reach it. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => void queryClient.refetchQueries({ type: "active" })}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/85"
          >
            <RotateCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="surface-card max-w-sm p-8 text-center">
        <Lock className="mx-auto h-5 w-5 text-muted-foreground" />
        <h1 className="heading-display mt-4 text-2xl text-foreground">Please unlock your wallet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter your access code first, then come back to this page.
        </p>
        <Link
          to="/w/$slug"
          params={{ slug }}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/85"
        >
          Go to my wallet
        </Link>
      </div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {textarea ? (
        <Textarea
          className="mt-1.5"
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          className="mt-1.5"
          type={type ?? "text"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("surface-card p-5", className)}>{children}</div>;
}
