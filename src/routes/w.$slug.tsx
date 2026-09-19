import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  FileText,
  IdCard,
  Lock,
  MessageCircle,
  NotebookPen,
  Phone,
  Shield,
  Siren,
  ScrollText,
  Users,
  ExternalLink,
} from "lucide-react";

import { getDocumentUrl, getWalletSummary, lockWalletFn, unlockWallet } from "@/lib/wallet.functions";
import { getHubSummary } from "@/lib/family.functions";
import { EXTRA_FEES, TERMS_HUB_URL, TOOL_LINKS, tierFor } from "@/lib/tiers";
import { GuaranteeContent } from "@/components/GuaranteeContent";
import { TermsContent } from "@/components/TermsContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/w/$slug")({
  head: () => ({
    meta: [
      { title: "Your Family Wallet — Athlete Mannies & Nannies" },
      {
        name: "description",
        content:
          "Your private family wallet: nanny agreement, nanny CV, membership, terms, our family guarantee and everyday nanny tools.",
      },
      { property: "og:title", content: "Your Family Wallet — Athlete Mannies & Nannies" },
      {
        property: "og:description",
        content: "Your private family wallet from Athlete Mannies & Nannies.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WalletPage,
});

const CHECK_LABELS: Record<string, { title: string }> = {
  dbs: { title: "DBS certificate" },
  id_check: { title: "ID & right to work" },
  reference_1: { title: "Reference" },
  reference_2: { title: "Reference" },
};

function WalletPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const summaryFn = useServerFn(getWalletSummary);
  const unlockFn = useServerFn(unlockWallet);
  const lockFn = useServerFn(lockWalletFn);
  const docFn = useServerFn(getDocumentUrl);
  const hubFn = useServerFn(getHubSummary);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<null | "terms" | "guarantee">(null);

  const query = useQuery({
    queryKey: ["wallet", slug],
    queryFn: () => summaryFn({ data: { slug } }),
  });

  const hubQuery = useQuery({
    queryKey: ["hub-summary", slug],
    queryFn: () => hubFn({ data: { slug } }),
  });
  const hub = hubQuery.data ?? null;

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await unlockFn({ data: { slug, code } });
      if (result.ok) {
        setCode("");
        await queryClient.invalidateQueries({ queryKey: ["wallet", slug] });
      } else {
        toast.error(
          result.reason === "rate_limited"
            ? "Too many tries. Please wait 15 minutes and try again."
            : "That code doesn't match. Please check and try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function openDoc(docType: string) {
    const { url } = await docFn({ data: { slug, docType } });
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("That document isn't available yet.");
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading your wallet…
      </div>
    );
  }

  const data = query.data;

  if (data && !data.unlocked) {
    if (!data.exists) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-sand px-5">
          <div className="max-w-sm text-center">
            <h1 className="heading-display text-2xl text-primary">Wallet not found</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This link isn't active. Please check the link we sent you, or get in touch and we'll
              send a fresh one.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-sand px-5 py-12">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-7 text-center">
          <Lock className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Athlete Mannies &amp; Nannies
          </p>
          <h1 className="heading-display mt-2 text-2xl text-primary">{data.familyName}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enter the 6-character access code we sent you. You'll only need to do this once on this
            device.
          </p>
          <form onSubmit={onUnlock} className="mt-5 space-y-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={10}
              autoCapitalize="characters"
              className="text-center text-lg tracking-[0.3em]"
              required
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Checking…" : "Open my wallet"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!data?.unlocked) return null;

  const wallet = data.wallet;
  const tier = tierFor(wallet.tierBand);
  const hasDoc = (type: string) => wallet.documents.some((d) => d.docType === type);

  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Athlete Mannies &amp; Nannies
        </p>
        <h1 className="heading-display mt-2 text-3xl leading-tight text-primary">
          {wallet.familyName}
        </h1>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Membership
              </p>
              <p className="heading-display mt-1 text-xl text-foreground">{tier.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tier.days} · {tier.price}
              </p>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground">
              Active
            </span>
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {wallet.startDate && (
              <div>
                <dt className="text-muted-foreground">Started with us</dt>
                <dd className="font-medium text-foreground">
                  {new Date(wallet.startDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
            {wallet.termsAcceptedOn && (
              <div>
                <dt className="text-muted-foreground">Terms accepted</dt>
                <dd className="font-medium text-foreground">
                  {new Date(wallet.termsAcceptedOn).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {(wallet.nannyName || wallet.nannyBio || wallet.nannyPhotoUrl) && (
          <div className="mt-4 rounded-xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Your nanny
            </p>
            <div className="mt-3 flex items-start gap-4">
              {wallet.nannyPhotoUrl && (
                <img
                  src={wallet.nannyPhotoUrl}
                  alt={wallet.nannyName ?? "Your nanny"}
                  className="h-20 w-20 flex-shrink-0 rounded-full border border-border object-cover"
                />
              )}
              <div>
                {wallet.nannyName && (
                  <p className="heading-display text-xl text-foreground">{wallet.nannyName}</p>
                )}
                {wallet.nannyBio && (
                  <p className="mt-1 text-sm text-muted-foreground">{wallet.nannyBio}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <Link
          to="/emergency/$slug"
          params={{ slug }}
          className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-destructive/40 bg-card p-5 hover:border-destructive"
        >
          <span>
            <span className="block font-medium text-foreground">Emergency card</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Contacts, allergies, medication, GP and home address — in one tap
            </span>
          </span>
          <Siren className="h-5 w-5 flex-shrink-0 text-destructive" />
        </Link>

        <h2 className="heading-display mt-9 text-lg text-foreground">Your family</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <HubTile
            slug={slug}
            to="/family/$slug"
            icon={Users}
            title="Know my family"
            subtitle={
              hub?.childCount
                ? `${hub.childCount} child${hub.childCount === 1 ? "" : "ren"} added`
                : "Children, routines, allergies and house rules"
            }
          />
          <HubTile
            slug={slug}
            to="/guide/$slug"
            icon={BookOpen}
            title="Nanny quick guide"
            subtitle="A one-page summary for your nanny"
          />
        </div>

        <h2 className="heading-display mt-9 text-lg text-foreground">This week</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <HubTile
            slug={slug}
            to="/planner/$slug"
            icon={CalendarDays}
            title="Weekly planner"
            subtitle={
              hub?.entries.length
                ? `${hub.entries.length} thing${hub.entries.length === 1 ? "" : "s"} planned this week`
                : "Plan pickups, clubs and activities"
            }
          />
          <HubTile
            slug={slug}
            to="/log/$slug"
            icon={NotebookPen}
            title="Daily log"
            subtitle={
              hub?.latestLog
                ? `Last update ${new Date(`${hub.latestLog.log_date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`
                : "End-of-shift updates from your nanny"
            }
          />
        </div>

        <h2 className="heading-display mt-9 text-lg text-foreground">Support</h2>
        <div className="mt-3">
          <HubTile
            slug={slug}
            to="/support/$slug"
            icon={MessageCircle}
            title="Ask Athlete Mannies"
            subtitle={
              hub?.unreadReplies
                ? `${hub.unreadReplies} new repl${hub.unreadReplies === 1 ? "y" : "ies"} from us`
                : "Pay, holidays, behaviour — ask us anything"
            }
          />
        </div>

        {(wallet.nannyEmergency || wallet.contacts.length > 0) && (
          <>
            <h2 className="heading-display mt-9 text-lg text-foreground">Emergency contacts</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {wallet.nannyEmergency && (
                <ContactCard
                  label="Nanny's emergency contact"
                  contact={wallet.nannyEmergency}
                />
              )}
              {wallet.contacts.map((contact, i) => (
                <ContactCard key={i} label="Family emergency contact" contact={contact} />
              ))}
            </div>
          </>
        )}

        <h2 className="heading-display mt-9 text-lg text-foreground">Your documents</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <DocTile
            icon={FileText}
            title="Nanny agreement"
            subtitle={hasDoc("agreement") ? "Open your signed agreement" : "Coming soon"}
            disabled={!hasDoc("agreement")}
            onClick={() => openDoc("agreement")}
          />
          <DocTile
            icon={IdCard}
            title="Your nanny's CV"
            subtitle={hasDoc("cv") ? "Experience, training and references" : "Coming soon"}
            disabled={!hasDoc("cv")}
            onClick={() => openDoc("cv")}
          />
          <DocTile
            icon={ScrollText}
            title="Membership terms"
            subtitle="The terms of your membership"
            onClick={() => setSheet("terms")}
          />
          <DocTile
            icon={Shield}
            title="Our family guarantee"
            subtitle="What we promise you, always"
            onClick={() => setSheet("guarantee")}
          />
        </div>

        {wallet.checks.length > 0 && (
          <>
            <h2 className="heading-display mt-9 text-lg text-foreground">
              Checks &amp; credentials
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {wallet.checks.map((check) => {
                const meta = CHECK_LABELS[check.docType] ?? { title: check.docType };
                const detail = [
                  check.issuedOn
                    ? `Issued ${new Date(check.issuedOn).toLocaleDateString("en-GB", {
                        month: "long",
                        year: "numeric",
                      })}`
                    : null,
                  check.referenceLabel,
                ]
                  .filter(Boolean)
                  .join(" · ");
                if (check.visibility === "badge") {
                  return (
                    <div
                      key={check.docType}
                      className="flex items-start gap-3 rounded-xl border border-border bg-card p-5"
                    >
                      <BadgeCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span>
                        <span className="block font-medium text-foreground">{meta.title}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          Verified by Athlete Mannies{detail ? ` · ${detail}` : ""}
                        </span>
                      </span>
                    </div>
                  );
                }
                return (
                  <DocTile
                    key={check.docType}
                    icon={BadgeCheck}
                    title={meta.title}
                    subtitle={detail || "Open document"}
                    onClick={() => openDoc(check.docType)}
                  />
                );
              })}
            </div>
          </>
        )}

        <h2 className="heading-display mt-9 text-lg text-foreground">Your everyday tools</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These open in a new tab so you always get the latest version.
        </p>
        <div className="mt-3 space-y-3">
          {TOOL_LINKS.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <span>
                <span className="block font-medium text-foreground">{tool.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{tool.description}</span>
              </span>
              <ArrowUpRight className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
            </a>
          ))}
        </div>

        {wallet.nannytaxCode && (
          <>
            <h2 className="heading-display mt-9 text-lg text-foreground">Your Nannytax code</h2>
            <div className="mt-3 rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Use this referral code when you set up payroll with Nannytax.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-accent px-3 py-2 font-mono text-base font-semibold tracking-wider text-foreground">
                  {wallet.nannytaxCode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(wallet.nannytaxCode!);
                    toast.success("Code copied");
                  }}
                >
                  Copy code
                </Button>
                <a
                  href="https://www.nannytax.co.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Visit Nannytax <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </>
        )}

        <h2 className="heading-display mt-9 text-lg text-foreground">Other fees</h2>
        <div className="mt-3 rounded-xl border border-border bg-card p-5">
          <dl className="space-y-3 text-sm">
            {EXTRA_FEES.map((fee) => (
              <div key={fee.label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{fee.label}</dt>
                <dd className="flex-shrink-0 font-medium text-foreground">{fee.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Wallet last updated{" "}
          {new Date(wallet.updatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm">
          <a
            href={TERMS_HUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            Full terms hub <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={async () => {
              await lockFn({ data: { slug } });
              await queryClient.invalidateQueries({ queryKey: ["wallet", slug] });
            }}
          >
            Lock this wallet
          </button>
        </div>
      </div>

      <Dialog open={sheet !== null} onOpenChange={(open) => !open && setSheet(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading-display text-xl">
              {sheet === "terms" ? "Membership terms & conditions" : "Our family guarantee"}
            </DialogTitle>
          </DialogHeader>
          {sheet === "terms" ? <TermsContent /> : <GuaranteeContent />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContactCard({
  label,
  contact,
}: {
  label: string;
  contact: { name: string; relationship: string | null; phone: string };
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-medium text-foreground">{contact.name}</p>
      {contact.relationship && (
        <p className="text-sm text-muted-foreground">{contact.relationship}</p>
      )}
      {contact.phone && (
        <a
          href={`tel:${contact.phone.replace(/\s+/g, "")}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Phone className="h-3.5 w-3.5" /> {contact.phone}
        </a>
      )}
    </div>
  );
}

function DocTile({
  icon: Icon,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
      <span>
        <span className="block font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

function HubTile({
  slug,
  to,
  icon: Icon,
  title,
  subtitle,
}: {
  slug: string;
  to: "/family/$slug" | "/guide/$slug" | "/planner/$slug" | "/log/$slug" | "/support/$slug";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      params={{ slug }}
      className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
      <span>
        <span className="block font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}
