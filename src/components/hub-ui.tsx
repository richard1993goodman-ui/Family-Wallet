import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function HubPage({
  slug,
  title,
  intro,
  children,
}: {
  slug: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Link
          to="/w/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to wallet
        </Link>
        <h1 className="heading-display mt-4 text-3xl leading-tight text-primary">{title}</h1>
        {intro && <p className="mt-2 text-sm text-muted-foreground">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function LockedNotice({ slug }: { slug: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-5">
      <div className="max-w-sm text-center">
        <h1 className="heading-display text-2xl text-primary">Please unlock your wallet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter your access code first, then come back to this page.
        </p>
        <Link
          to="/w/$slug"
          params={{ slug }}
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
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

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5">{children}</div>;
}
