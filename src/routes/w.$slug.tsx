import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  IdCard,
  Lock,
  MessageCircle,
  NotebookPen,
  Clock3,
  Phone,
  Shield,
  Siren,
  ScrollText,
  Users,
  UtensilsCrossed,
  WandSparkles,
  ExternalLink,
} from "lucide-react";

import { getDocumentUrl, getWalletSummary, lockWalletFn, unlockWallet } from "@/lib/wallet.functions";
import { getHubSummary } from "@/lib/family.functions";
import { getAgreement } from "@/lib/agreement.functions";
import { TERMS_HUB_URL } from "@/lib/tiers";
import type { WorkingDay } from "@/lib/agreement.model";
import { GuaranteeContent } from "@/components/GuaranteeContent";
import { SigningProgress, signingRows } from "@/components/SigningProgress";
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
  const agreementFn = useServerFn(getAgreement);

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

  const agreementQuery = useQuery({
    queryKey: ["agreement", slug],
    queryFn: () => agreementFn({ data: { slug } }),
  });
  const agreement = agreementQuery.data ?? null;
  const agreementDone =
    agreement?.status === "issued" &&
    signingRows(agreement.signatures, agreement.version).complete;
  const agreementSubtitle = !agreement
    ? "Build it, then sign it here"
    : !agreement.hasContent
      ? "Not started — build it here"
      : agreement.status !== "issued"
        ? "Draft saved — finish and open for signing"
        : agreementDone
          ? "Signed by you and your nanny"
          : "Ready to sign — parent and nanny";

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
  const isNanny = wallet.access === "nanny";
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

        <TodayPanel slug={slug} entries={hub?.entries ?? []} workingDays={hub?.workingDays ?? []} />

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

        {agreement && agreement.hasContent && (
          <div className="mt-3">
            <SigningProgress
              status={agreement.status}
              version={agreement.version}
              signatures={agreement.signatures}
            />
          </div>
        )}

        {agreement && !agreementDone && (
          <Link
            to="/agreement/$slug"
            params={{ slug }}
            className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-primary/50 bg-card p-5 hover:border-primary"
          >
            <span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Start here
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {agreement.hasContent ? "Finish your nanny agreement" : "Build your nanny agreement"}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {agreement.status === "issued"
                  ? "Parent and nanny both need to sign it"
                  : "Fill it in together with your nanny, then sign it here"}
              </span>
            </span>
            <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
          </Link>
        )}


        {!isNanny && <><h2 className="heading-display mt-9 text-lg text-foreground">Your family</h2>
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
        </div></>}

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

        <h2 className="heading-display mt-9 text-lg text-foreground">Activities, meals &amp; pay</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <HubTile slug={slug} to="/activities/$slug" icon={WandSparkles} title="Nanny Activity Guide" subtitle="Create, save and plan personalised activities" />
          <HubTile slug={slug} to="/fuel/$slug" icon={UtensilsCrossed} title="Nanny Fuel" subtitle="Cooking and meal ideas saved to your calendar" />
          <HubTile slug={slug} to="/timesheets/$slug" icon={Clock3} title="Timesheets" subtitle={isNanny ? "Add shifts and see payment approval" : "Review hours and approve payment"} />
        </div>

        <h2 className="heading-display mt-9 text-lg text-foreground">Training</h2>
        <div className="mt-3">
          <HubTile
            slug={slug}
            to="/training/$slug"
            icon={GraduationCap}
            title="Nanny training hub"
            subtitle="20 questions on routine, safeguarding and emergencies — with a certificate"
          />
        </div>

        {!isNanny && <><h2 className="heading-display mt-9 text-lg text-foreground">Support</h2>
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
        </div></>}

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

        <h2 className="heading-display mt-9 text-lg text-foreground">{isNanny ? "Your agreement" : "Your documents"}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <HubTile
            slug={slug}
            to="/agreement/$slug"
            icon={FileText}
            title="Nanny agreement"
            subtitle={agreementSubtitle}
          />
          {!isNanny && <DocTile
            icon={IdCard}
            title="Your nanny's CV"
            subtitle={hasDoc("cv") ? "Experience, training and references" : "Coming soon"}
            disabled={!hasDoc("cv")}
            onClick={() => openDoc("cv")}
          />}
          {!isNanny && <HubTile
            slug={slug}
            to="/terms/$slug"
            icon={ScrollText}
            title="Membership terms"
            subtitle={
              wallet.termsAcceptedOn ? "Signed — view your copy" : "Read and sign your terms"
            }
          />}
          {!isNanny && <DocTile
            icon={Shield}
            title="Our family guarantee"
            subtitle="What we promise you, always"
            onClick={() => setSheet("guarantee")}
          />}
        </div>

        {!isNanny && wallet.checks.length > 0 && (
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

        {!isNanny && wallet.nannytaxCode && (
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
                   Visit Nannytax <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </>
        )}

        {!isNanny && <div className="mt-9 flex items-center justify-between rounded-xl border border-border bg-card p-5"><span className="font-medium text-foreground">Membership</span><span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground">Active</span></div>}

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

function shortTime(value: string) {
  return value.replace(/:00$/, "").replace(/^0/, "");
}

function TodayPanel({ slug, entries, workingDays }: {
  slug: string;
  entries: Array<{ id: string; entry_date: string; time_label: string | null; end_time_label: string | null; title: string; entry_type: string; status: string }>;
  workingDays: WorkingDay[];
}) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const weekStart = new Date(`${todayIso}T00:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(weekStart.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const selected = new Date(`${selectedDate}T00:00:00Z`);
  const weekday = selected.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const regular = workingDays.find((day) => day.day === weekday && day.enabled);
  const selectedEntries = entries.filter((entry) => entry.entry_date === selectedDate);
  const cancelled = selectedEntries.some((entry) => entry.entry_type === "shift_change" && entry.status === "cancelled");
  const selectedIsToday = selectedDate === todayIso;

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Family calendar</p>
          <p className="heading-display mt-1 text-2xl text-foreground">
            {today.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Link to="/planner/$slug" params={{ slug }} className="text-sm font-medium text-primary hover:underline">Open calendar</Link>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Your nanny’s agreed days and hours sync from the nanny agreement. Add activities, school dates, notes and one-off shift changes manually.
      </p>

      <div className="mt-5 grid grid-cols-7 gap-1" aria-label="This week">
        {weekDays.map((iso) => {
          const date = new Date(`${iso}T00:00:00Z`);
          const isToday = iso === todayIso;
          const isSelected = iso === selectedDate;
          const hasEntries = entries.some((entry) => entry.entry_date === iso);
          const dayName = date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
          const dayShift = workingDays.find((day) => day.day === dayName && day.enabled);
          const dayCancelled = entries.some(
            (entry) =>
              entry.entry_date === iso &&
              entry.entry_type === "shift_change" &&
              entry.status === "cancelled",
          );
          return (
            <Button
              key={iso}
              type="button"
              variant={isSelected ? "default" : "ghost"}
              onClick={() => setSelectedDate(iso)}
              aria-pressed={isSelected}
              aria-label={`${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}${isToday ? ", today" : ""}`}
              className={`relative h-auto min-w-0 flex-col gap-1 px-1 py-2 ${isToday && !isSelected ? "ring-1 ring-primary" : ""}`}
            >
              <span className="text-[10px] font-semibold uppercase">
                {date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).slice(0, 2)}
              </span>
              <span className="text-base">{date.getUTCDate()}</span>
              <span className="text-[9px] leading-tight opacity-80">
                {dayShift && !dayCancelled
                  ? `${shortTime(dayShift.startTime)}-${shortTime(dayShift.endTime)}`
                  : "\u00A0"}
              </span>
              <span className={`h-1 w-1 rounded-full ${hasEntries ? "bg-current" : "bg-transparent"}`} />
              {isToday && (
                <span className="absolute -bottom-5 text-[10px] font-semibold text-primary">Today</span>
              )}
            </Button>
          );
        })}
      </div>

      <div className="mt-8 border-t border-border pt-4">
        <p className="font-medium text-foreground">
          {selectedIsToday ? "Today" : selected.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
        </p>
      </div>
      {regular && !cancelled && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">Nanny working · {regular.startTime}–{regular.endTime}{regular.startTime2 && regular.endTime2 ? ` and ${regular.startTime2}–${regular.endTime2}` : ""} · synced from agreement</p>}
      {cancelled && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">This regular nanny shift has been cancelled.</p>}
      <div className="mt-4 space-y-2">
        {selectedEntries.length === 0 && !regular && <p className="text-sm text-muted-foreground">Nothing planned for this day yet.</p>}
        {selectedEntries.map((entry) => <div key={entry.id} className="flex gap-3 text-sm"><span className="w-24 flex-shrink-0 font-medium text-primary">{entry.time_label ?? "Any time"}{entry.end_time_label ? `–${entry.end_time_label}` : ""}</span><span className="text-foreground">{entry.title}</span></div>)}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild size="sm"><Link to="/planner/$slug" params={{ slug }}>Add to calendar</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/log/$slug" params={{ slug }}>Add daily notes</Link></Button>
      </div>
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
  to:
    | "/family/$slug"
    | "/guide/$slug"
    | "/planner/$slug"
    | "/log/$slug"
    | "/support/$slug"
    | "/training/$slug"
    | "/agreement/$slug"
    | "/terms/$slug"
    | "/activities/$slug"
    | "/fuel/$slug"
    | "/timesheets/$slug";
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
