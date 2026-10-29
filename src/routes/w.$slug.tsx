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
  Plane,
  Pill,
  FileBarChart,
  CalendarCheck,
  ClipboardCheck,
  Dumbbell,
  Phone,
  ReceiptText,
  Shield,
  LifeBuoy,
  Siren,
  ScrollText,
  Users,
  UserPlus,
  UtensilsCrossed,
  WandSparkles,
  Gift,
  Library,
  Calculator,
  Handshake,
  ShieldCheck,
  Landmark,
  ExternalLink,
  Camera,
  Sparkles,
} from "lucide-react";

import { getDocumentUrl, getWalletSummary, lockWalletFn, unlockWallet } from "@/lib/wallet.functions";
import { WalletChallenges } from "@/components/WalletChallenges";
import { WalletTravelBanner } from "@/components/WalletTravelBanner";
import { getHubSummary } from "@/lib/family.functions";
import { getFirst48 } from "@/lib/welcome.functions";
import { getNannies } from "@/lib/nannies.functions";
import { getAgreement } from "@/lib/agreement.functions";
import { TERMS_HUB_URL } from "@/lib/tiers";
import type { WorkingDay } from "@/lib/agreement.model";

type NannySchedule = { nannyId: string; nannyName: string; workingDays: WorkingDay[] };
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
      { title: "Your Family Wallet" },
      {
        name: "description",
        content:
          "Your private Family Wallet: nanny agreement, nanny CV, terms, our family guarantee and everyday nanny tools.",
      },
      { property: "og:title", content: "Your Family Wallet" },
      {
        property: "og:description",
        content: "Your private Family Wallet from your agency.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const nanniesFn = useServerFn(getNannies);

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

  const nanniesQuery = useQuery({
    queryKey: ["nannies", slug],
    queryFn: () => nanniesFn({ data: { slug } }),
  });
  const nannies = nanniesQuery.data?.nannies ?? [];
  const outstandingAgreements = nannies.filter((n) => !n.agreementSigned);
  const singleAgreementDone =
    agreement?.status === "issued" &&
    signingRows(agreement.signatures, agreement.version).complete;
  const agreementDone =
    nannies.length > 0 ? outstandingAgreements.length === 0 : Boolean(singleAgreementDone);
  const agreementSubtitle =
    nannies.length > 1
      ? outstandingAgreements.length === 0
        ? `All ${nannies.length} agreements signed`
        : `${outstandingAgreements.length} of ${nannies.length} still to sign`
      : !agreement
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
        await queryClient.invalidateQueries();
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
        <div className="w-full max-w-sm rounded-2xl bg-card shadow-sm p-7 text-center">
          <Lock className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            The Family Wallet
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
        {slug === "demo" && (
          <div className="mb-6 rounded-2xl bg-card shadow-sm p-4 text-sm">
            <p className="font-semibold text-primary">You're viewing a demo Family Wallet</p>
            <p className="mt-1 text-muted-foreground">
              The Harrington family, their nanny Jess and everything here are examples. Explore freely — as a member,
              your own private wallet is set up with your family, your nanny and your agreement.
            </p>
          </div>
        )}
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {wallet.agencyName ?? "The Family Wallet"}
        </p>
        <h1 className="heading-display mt-2 text-3xl leading-tight text-primary">
          {wallet.familyName}
        </h1>

        <WalletTravelBanner slug={slug} />
        {!isNanny && (
          <SetupStatus
            slug={slug}
            items={[
              {
                label: "Nanny added",
                done: nannies.length > 0,
                hint: "Add everyone you employ with us",
                to: "/nannies/$slug",
              },
              {
                label:
                  nannies.length > 1 ? "Every nanny agreement signed" : "Nanny agreement signed",
                done: Boolean(agreementDone),
                hint: "Build it, then both of you sign it",
                to: "/agreement/$slug",
              },
              {
                label: "Agency terms signed",
                done: Boolean(wallet.termsAcceptedOn),
                hint: "Read and sign your agency terms",
                to: "/terms/$slug",
              },
              {
                label: "Children added",
                done: Boolean(hub?.readiness?.children),
                hint: "Add each child so your nanny knows who's who",
                to: "/family/$slug",
              },
              {
                label: "Allergies & medication",
                done: Boolean(hub?.readiness?.allergies),
                hint: "Add allergies and medication for every child",
                to: "/family/$slug",
              },
              {
                label: "Emergency contacts",
                done: Boolean(hub?.readiness?.contacts),
                hint: "At least one contact we can call",
                to: "/emergency/$slug",
              },
              {
                label: "Home address",
                done: Boolean(hub?.readiness?.homeAddress),
                hint: "Needed on the emergency card and the agreement",
                to: "/emergency/$slug",
              },
              {
                label: "GP details",
                done: Boolean(hub?.readiness?.gp),
                hint: "Your family doctor's name and number",
                to: "/emergency/$slug",
              },
              {
                label: "House rules",
                done: Boolean(hub?.readiness?.houseRules),
                hint: "Screen time, homework and the basics",
                to: "/family/$slug",
              },
            ]}
          />
        )}
        <WelcomeCard slug={slug} />

        {wallet.nannies.length > 0 && (
          <div className="mt-4 rounded-2xl bg-card shadow-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {wallet.nannies.length > 1 ? "Your nannies" : "Your nanny"}
            </p>
            <div className="mt-3 space-y-4">
              {wallet.nannies.map((nanny) => (
                <div key={nanny.id} className="flex items-start gap-4">
                  {nanny.photoUrl && (
                    <img
                      src={nanny.photoUrl}
                      alt={nanny.name}
                      className="h-16 w-16 flex-shrink-0 rounded-full border border-border object-cover"
                    />
                  )}
                  <div>
                    <p className="heading-display text-xl text-foreground">
                      {nanny.name}
                      {nanny.isYou && (
                        <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium">
                          You
                        </span>
                      )}
                    </p>
                    {nanny.bio && <p className="mt-1 text-sm text-muted-foreground">{nanny.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="ios-section-title mt-6">This week</h2>
        <TodayPanel slug={slug} entries={hub?.entries ?? []} schedules={hub?.schedules ?? []} />
        <div className="ios-group mt-2">
          <HubTile slug={slug} to="/planner/$slug" icon={CalendarDays} title="Weekly planner" subtitle={hub?.entries.length ? `${hub.entries.length} thing${hub.entries.length === 1 ? "" : "s"} planned this week` : "Plan pickups, clubs and activities"} />
          <HubTile slug={slug} to="/log/$slug" icon={NotebookPen} title="Daily log" subtitle={hub?.latestLog ? `Last update ${new Date(`${hub.latestLog.log_date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}` : "End-of-shift updates from your nanny"} />
          <HubTile slug={slug} to="/handover/$slug" icon={ClipboardCheck} title="Handover &amp; expenses" subtitle={hub?.latestHandover ? `Last handover ${new Date(`${hub.latestHandover.handover_date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}` : "Doorstep wrap-up, tomorrow's kit and petty cash"} />
          <HubTile slug={slug} to="/travel/$slug" icon={Plane} title="Travel &amp; Villa Nanny Pack" subtitle="Going abroad? Checklist, local emergency info and travel handovers" />
          <HubTile slug={slug} to="/report/$slug" icon={FileBarChart} title="Friday Weekly Report" subtitle="Your week at a glance — hours, activities, handovers and expenses" />
          <HubTile slug={slug} to="/medication/$slug" icon={Pill} title="Medication log" subtitle="Timestamped doses — see if Calpol has already been given" />
          <HubTile slug={slug} to="/moments/$slug" icon={Camera} title="Photo moments &amp; milestones" subtitle="A private photo diary and milestone journal for your children" />
        </div>


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

        {!isNanny && (
          <Link
            to="/cover/$slug"
            params={{ slug }}
            className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-primary/50 bg-accent p-5 hover:border-primary"
          >
            <span>
              <span className="block font-medium text-foreground">Request cover</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Nanny off sick, a night out or an extra day — ask us for cover or a babysitter
              </span>
            </span>
            <LifeBuoy className="h-5 w-5 flex-shrink-0 text-primary" />
          </Link>
        )}

        {!isNanny && <><h2 className="ios-section-title mt-8">Your family</h2>
        <div className="ios-group mt-2">
          <HubTile slug={slug} to="/family/$slug" icon={Users} title="Know my family" subtitle={hub?.childCount ? `${hub.childCount} child${hub.childCount === 1 ? "" : "ren"} added` : "Children, routines, allergies and house rules"} />
          <HubTile slug={slug} to="/nannies/$slug" icon={UserPlus} title="Your nannies" subtitle={nannies.length ? `${nannies.length} added — invite codes and agreements` : "Add each nanny you employ with us"} />
          <HubTile slug={slug} to="/guide/$slug" icon={BookOpen} title="Nanny quick guide" subtitle="A one-page summary for your nanny" />
          <HubTile slug={slug} to="/safety/$slug" icon={ShieldCheck} title="Insurance &amp; safeguarding" subtitle="Checks, training and insurance records in one place" />
        </div></>}

        {isNanny && <div className="mt-4"><HubTile slug={slug} to="/safety/$slug" icon={ShieldCheck} title="Insurance &amp; safeguarding" subtitle="Your checks, training and insurance records" /></div>}

        {!isNanny && <><h2 className="ios-section-title mt-8">Family concierge</h2><div className="ios-group mt-2">
          <HubTile slug={slug} to="/payroll/$slug" icon={Landmark} title="Managed payroll setup" subtitle="A guided Nannytax introduction with visible next steps" />
          <HubTile slug={slug} to="/costs/$slug" icon={Calculator} title="All-in employment cost" subtitle="Estimate your nanny's pay, employer NI and pension" />
          <HubTile slug={slug} to="/curation/$slug" icon={Handshake} title="Private nanny curation" subtitle="A discreet, personally selected search — never a public catalogue" />
        </div></>}



        {nannies.length <= 1 && agreement && agreement.hasContent && !agreementDone && (
          <div className="mt-3">
            <SigningProgress
              status={agreement.status}
              version={agreement.version}
              signatures={agreement.signatures}
            />
          </div>
        )}

        {nannies.length > 1 && outstandingAgreements.length > 0 && (
          <div className="mt-3 rounded-2xl bg-card shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Agreements still to sign
            </p>
            <ul className="mt-3 space-y-2">
              {outstandingAgreements.map((nanny) => (
                <li key={nanny.id}>
                  <Link
                    to="/agreement/$slug"
                    params={{ slug }}
                    search={{ nanny: nanny.id }}
                    className="flex items-center justify-between gap-3 rounded-lg px-1 py-1 text-sm hover:bg-muted/60"
                  >
                    <span className="font-medium text-foreground">{nanny.name}</span>
                    <span className="text-muted-foreground">
                      {nanny.agreementStatus === "none"
                        ? "Not started"
                        : nanny.agreementStatus === "draft"
                          ? "Draft saved"
                          : "Awaiting signatures"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {nannies.length <= 1 && agreement && !agreementDone && (
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


        <h2 className="ios-section-title mt-8">Activities, meals &amp; pay</h2>
        <WalletChallenges slug={slug} />
        <div className="ios-group mt-2">
          <HubTile slug={slug} to="/passport/$slug" icon={Dumbbell} title="Active Kids Passport" subtitle={hub?.latestPassport ? `${hub.latestPassport.child_name}: ${hub.latestPassport.activity}` : "Sports skills, challenges and confidence wins"} />
          <ExternalToolTile href="https://nannyguide.lovable.app" icon={WandSparkles} title="Nanny Activity Guide" subtitle="Open the original activity ideas app" />
          <ExternalToolTile href="https://nanny-nourish-guide.lovable.app" icon={UtensilsCrossed} title="Nanny Fuel" subtitle="Open the original cooking and meal ideas app" />
          <HubTile slug={slug} to="/timesheets/$slug" icon={Clock3} title="Timesheets" subtitle={isNanny ? "Add shifts and see payment approval" : "Review hours and approve payment"} />
          <HubTile slug={slug} to="/leave/$slug" icon={Plane} title="Holiday &amp; leave" subtitle={isNanny ? "See your entitlement and request time off" : "Track entitlement and approve time off"} />
          <HubTile slug={slug} to="/handover/$slug" icon={ReceiptText} title="Expense tracker" subtitle={hub?.pendingExpensesTotal ? `£${hub.pendingExpensesTotal.toFixed(2)} awaiting reimbursement` : isNanny ? "Submit small costs for reimbursement" : "See and mark petty cash as reimbursed"} />
        </div>

        {(wallet.nannies.some((n) => n.emergency) || wallet.contacts.length > 0) && (
          <>
            <h2 className="ios-section-title mt-8">Emergency contacts</h2>
            <div className="ios-group mt-2">
              {wallet.nannies
                .filter((n) => n.emergency)
                .map((nanny) => (
                  <ContactCard
                    key={nanny.id}
                    label={`${nanny.name}'s emergency contact`}
                    contact={nanny.emergency!}
                  />
                ))}
              {wallet.contacts.map((contact, i) => (
                <ContactCard key={i} label="Family emergency contact" contact={contact} />
              ))}
            </div>
          </>
        )}

        <h2 id="documents" className="heading-display mt-9 scroll-mt-20 text-lg text-foreground">{isNanny ? "Your agreement" : "Your documents"}</h2>
        <div className="ios-group mt-2">
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
            title="Agency terms"
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
            <h2 className="ios-section-title mt-8">
              Checks &amp; credentials
            </h2>
            <div className="ios-group mt-2">
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
                      className="flex items-start gap-3 rounded-2xl bg-card shadow-sm p-5"
                    >
                      <BadgeCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span>
                        <span className="block font-medium text-foreground">{meta.title}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          Verified by your agency{detail ? ` · ${detail}` : ""}
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
            <h2 className="ios-section-title mt-8">Your Nannytax code</h2>
            <div className="mt-3 rounded-2xl bg-card shadow-sm p-5">
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

        <h2 className="ios-section-title mt-8">Extras from your agency</h2>
        <div className="ios-group mt-2">
          <HubTile slug={slug} to="/perks/$slug" icon={Gift} title="Family perks" subtitle="Private London partner offers and family concierge recommendations" />
          <HubTile slug={slug} to="/playbooks/$slug" icon={Library} title="Agency Materials" subtitle="Audiobooks, digital books, activity guides and seasonal packs from the agency" />
        </div>

        <h2 className="ios-section-title mt-8">Help &amp; training</h2>
        <div className="ios-group mt-2">
          <HubTile slug={slug} to="/support/$slug" icon={MessageCircle} title="Ask your agency" subtitle={hub?.unreadReplies ? `${hub.unreadReplies} new repl${hub.unreadReplies === 1 ? "y" : "ies"} from us` : `Message us as ${isNanny ? "the nanny" : "the family"}`} />
          <HubTile slug={slug} to="/checkin/$slug" icon={CalendarCheck} title="Reviews &amp; check-ins" subtitle="6-month and yearly guides, or ask us for a neutral call" />
          <HubTile slug={slug} to="/training/$slug" icon={GraduationCap} title="Nanny training hub" subtitle="20 questions on routine, safeguarding and emergencies — with a certificate" />
          <a
            href="https://www.acas.org.uk/disciplinary-procedure-step-by-step"
            target="_blank"
            rel="noopener noreferrer"
            className="ios-row"
          >
            <ScrollText className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                ACAS disciplinary procedure
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Official step-by-step guidance for handling disciplinary matters fairly
              </span>
            </span>
          </a>
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
              {sheet === "terms" ? "Agency terms & conditions" : "Our family guarantee"}
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
    <div className="rounded-2xl bg-card shadow-sm p-5">
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

type SetupItem = {
  label: string;
  done: boolean;
  hint: string;
  to: "/agreement/$slug" | "/terms/$slug" | "/family/$slug" | "/emergency/$slug" | "/nannies/$slug";
};

function SetupStatus({ slug, items }: { slug: string; items: SetupItem[] }) {
  const [open, setOpen] = useState(false);
  const done = items.filter((item) => item.done).length;
  const total = items.length;
  const allDone = done === total;
  const outstanding = items.filter((item) => !item.done);
  if (allDone) return null;
  const barColour = allDone ? "bg-emerald-600" : done >= total / 2 ? "bg-amber-500" : "bg-destructive";

  return (
    <div className="mt-4 rounded-2xl bg-card shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Actions to complete
          </p>
          <p className="mt-1 font-medium text-foreground">
            {allDone ? "Everything is complete" : `${total - done} still to do`}
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {done} of {total}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${barColour}`}
          style={{ width: `${Math.round((done / total) * 100)}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2.5">
        {(open ? items : outstanding.slice(0, 3)).map((item) => (
          <li key={item.label}>
            <Link
              to={item.to}
              params={{ slug }}
              className="flex items-start gap-3 rounded-lg px-1 py-1 hover:bg-muted/60"
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                  item.done ? "bg-emerald-600" : "bg-destructive"
                }`}
              />
              <span className="text-sm">
                <span
                  className={`block font-medium ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                >
                  {item.label}
                </span>
                {!item.done && <span className="block text-muted-foreground">{item.hint}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {(outstanding.length > 3 || open) && (
        <button
          className="mt-3 text-sm font-medium text-primary hover:underline"
          onClick={() => setOpen(!open)}
        >
          {open ? "Show less" : `Show all ${total}`}
        </button>
      )}
    </div>
  );
}

function shortTime(value: string) {
  return value.replace(/:00$/, "").replace(/^0/, "");
}

function TodayPanel({ slug, entries, schedules }: {
  slug: string;
  entries: Array<{ id: string; entry_date: string; time_label: string | null; end_time_label: string | null; title: string; entry_type: string; status: string }>;
  schedules: NannySchedule[];
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
  const onDay = (iso: string) => {
    const dayName = new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "long",
      timeZone: "UTC",
    });
    return schedules
      .map((schedule) => ({
        nannyName: schedule.nannyName,
        shift: schedule.workingDays.find((day) => day.day === dayName && day.enabled),
      }))
      .filter((row): row is { nannyName: string; shift: WorkingDay } => Boolean(row.shift));
  };
  const selected = new Date(`${selectedDate}T00:00:00Z`);
  const selectedWorking = onDay(selectedDate);
  const selectedEntries = entries.filter((entry) => entry.entry_date === selectedDate);
  const cancelled = selectedEntries.some((entry) => entry.entry_type === "shift_change" && entry.status === "cancelled");
  const selectedIsToday = selectedDate === todayIso;
  const anyHours = schedules.some((schedule) => schedule.workingDays.some((day) => day.enabled));

  return (
    <div className="mt-6 rounded-2xl bg-card shadow-sm p-6">
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
        Each nanny’s agreed days and hours sync from their nanny agreement. Add activities, school dates, notes and one-off shift changes manually.
      </p>

      <div className="mt-5 grid grid-cols-7 gap-1" aria-label="This week">
        {weekDays.map((iso) => {
          const date = new Date(`${iso}T00:00:00Z`);
          const isToday = iso === todayIso;
          const isSelected = iso === selectedDate;
          const hasEntries = entries.some((entry) => entry.entry_date === iso);
          const working = onDay(iso);
          const dayCancelled = entries.some(
            (entry) =>
              entry.entry_date === iso &&
              entry.entry_type === "shift_change" &&
              entry.status === "cancelled",
          );
          const label =
            working.length === 0 || dayCancelled
              ? "\u00A0"
              : working.length === 1
                ? `${shortTime(working[0]!.shift.startTime)}-${shortTime(working[0]!.shift.endTime)}`
                : `${working.length} on`;
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
              <span className="text-[9px] leading-tight opacity-80">{label}</span>
              <span className={`h-1 w-1 rounded-full ${hasEntries ? "bg-current" : "bg-transparent"}`} />
              {isToday && (
                <span className="absolute -bottom-5 text-[10px] font-semibold text-primary">Today</span>
              )}
            </Button>
          );
        })}
      </div>

      <div className="mt-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Agreed nanny hours
        </p>
        {anyHours ? (
          <div className="mt-3 space-y-3">
            {schedules
              .filter((schedule) => schedule.workingDays.some((day) => day.enabled))
              .map((schedule) => (
                <div key={schedule.nannyId}>
                  <p className="text-sm font-medium text-foreground">{schedule.nannyName}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {schedule.workingDays
                      .filter((day) => day.enabled)
                      .map((day) => (
                        <span
                          key={day.day}
                          className="rounded-full bg-accent px-2.5 py-1 text-xs text-foreground"
                        >
                          {day.day.slice(0, 3)} {day.startTime}–{day.endTime}
                          {day.startTime2 && day.endTime2 ? ` · ${day.startTime2}–${day.endTime2}` : ""}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No days set yet — add them in each nanny agreement and they'll appear here.
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <p className="font-medium text-foreground">
          {selectedIsToday ? "Today" : selected.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
        </p>
      </div>
      {!cancelled &&
        selectedWorking.map((row) => (
          <p key={row.nannyName} className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
            {row.nannyName} working · {row.shift.startTime}–{row.shift.endTime}
            {row.shift.startTime2 && row.shift.endTime2
              ? ` and ${row.shift.startTime2}–${row.shift.endTime2}`
              : ""} · synced from agreement
          </p>
        ))}
      {cancelled && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">A regular nanny shift has been cancelled on this day.</p>}
      <div className="mt-4 space-y-2">
        {selectedEntries.length === 0 && selectedWorking.length === 0 && <p className="text-sm text-muted-foreground">Nothing planned for this day yet.</p>}
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
      className="flex w-full items-start gap-3 rounded-2xl bg-card shadow-sm p-5 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className="ios-icon"><Icon className="h-4 w-4" /></span>
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
    | "/nannies/$slug"
    | "/guide/$slug"
    | "/planner/$slug"
    | "/log/$slug"
    | "/support/$slug"
    | "/training/$slug"
    | "/agreement/$slug"
    | "/terms/$slug"
    | "/activities/$slug"
    | "/fuel/$slug"
    | "/leave/$slug"
    | "/medication/$slug"
    | "/checkin/$slug"
    | "/passport/$slug"
    | "/handover/$slug"
    | "/timesheets/$slug"
    | "/report/$slug"
    | "/travel/$slug"
    | "/perks/$slug"
    | "/playbooks/$slug"
    | "/payroll/$slug"
    | "/costs/$slug"
    | "/curation/$slug"
    | "/safety/$slug"
    | "/moments/$slug";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      params={{ slug }}
      className="ios-row"
    >
      <span className="ios-icon"><Icon className="h-4 w-4" /></span>
      <span>
        <span className="block font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}

function ExternalToolTile({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="ios-row">
      <span className="ios-icon"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-medium text-foreground">{title}<ExternalLink className="h-3.5 w-3.5" /></span>
        <span className="mt-1 block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </a>
  );
}

function WelcomeCard({ slug }: { slug: string }) {
  const welcomeFn = useServerFn(getFirst48);
  const welcomeQuery = useQuery({
    queryKey: ["first48", slug],
    queryFn: () => welcomeFn({ data: { slug } }),
  });
  const welcome = welcomeQuery.data;

  if (!welcome) return null;
  const done = welcome.nannies.reduce((total, nanny) => total + nanny.doneCount, 0);
  const total = welcome.nannies.reduce((total, nanny) => total + nanny.total, 0);
  const completed = total > 0 && done === total;
  if (completed) return null;

  return (
    <Link
      to="/welcome/$slug"
      params={{ slug }}
      className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-primary/40 bg-accent p-5 hover:border-primary"
    >
      <span>
        <span className="block font-medium text-foreground">
          {completed ? "First 48 hours — agreed together" : "First 48 hours — a confident start"}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {total ? `${done} of ${total} agreed by parent and nanny · Routines, pickups and your first handover` : "Add your nanny, then agree the essentials together."}
        </span>
      </span>
      <Sparkles className="h-5 w-5 flex-shrink-0 text-primary" />
    </Link>
  );
}
