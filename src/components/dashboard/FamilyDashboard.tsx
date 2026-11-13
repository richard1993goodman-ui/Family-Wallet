import { formatDate, formatMoney } from "@/lib/format";
import { AgreementChoice } from "@/components/AgreementChoice";
import { Link } from "@tanstack/react-router";
import { AlertsPrompt } from "@/components/dashboard/AlertsPrompt";
import { LatestPhotoCard, TodayTimeline } from "@/components/TodayTimeline";
import type { MonthSchedule } from "@/lib/month-overview";
import { SupportBox } from "@/components/SupportBox";
import { NextStep } from "@/components/dashboard/NextStep";
import { hasHours } from "@/lib/work-hours";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  FileChartColumn,
  Briefcase,
  Calculator,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  ExternalLink,
  FileText,
  GraduationCap,
  Heart,
  IdCard,
  KeyRound,
  Landmark,
  MessageCircle,
  Baby,
  NotebookPen,
  Pill,
  CalendarCheck,
  ReceiptText,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageContainer } from "@/components/hub-ui";
import { SigningProgress } from "@/components/SigningProgress";
import { WalletTravelBanner } from "@/components/WalletTravelBanner";
import { Button } from "@/components/ui/button";
import { SetupStatus } from "@/components/dashboard/SetupStatus";
import { MonthOverview } from "@/components/dashboard/MonthOverview";
import {
  Column,
  DashboardFooter,
  DemoBanner,
  EmergencyPill,
  EmergencyContacts,
  NannyProfiles,
} from "@/components/dashboard/sections";
import {
  ActionRow,
  CountBadge,
  DocTile,
  HubTile,
  SectionTitle,
} from "@/components/dashboard/tiles";
import { greeting, londonToday, longDate } from "@/lib/dashboard-format";
import type { DashboardProps } from "@/components/dashboard/types";
import type { CSSProperties } from "react";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/en-GB";

const CHECK_LABELS: Record<string, MessageKey> = {
  dbs: "dash.dbsCertificate",
  id_check: "dash.idRightToWork",
  reference_1: "dash.reference",
  reference_2: "dash.reference",
};

export function FamilyDashboard(props: DashboardProps) {
  const t = useT();
  const { slug, wallet, hub, onLock, nannyCount } = props;
  const today = hub?.today.date ?? londonToday();

  return (
    <PageContainer width="wide">
      <DemoBanner slug={slug} />
      {/* The top bar already names the household, so Home opens with the date and a greeting. */}
      <header>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-[0.875rem] text-muted-foreground">
            {longDate(hub?.today.date)}
            {wallet.agencyName && (
              <span> · {t("shell.withAgency", { agency: wallet.agencyName })}</span>
            )}
          </p>
          <EmergencyPill slug={slug} />
        </div>
        <h1 className="heading-serif mt-2 text-[1.75rem] leading-[1.1] text-foreground sm:text-[2rem]">
          {greeting()}
        </h1>
      </header>
      <WalletTravelBanner slug={slug} />

      {/* Same order as the app's Home design: what is happening now, one-tap logging, the latest,
          what needs you, then the week, the newest photo and the two most-used actions. */}
      <div className="mt-6 space-y-5">
        <AgreementChoice slug={slug} firstSignIn />
        <TodayTimeline slug={slug} home />
        <NeedsAttention {...props} />
        <NextStep {...props} />
        <WeekStrip slug={slug} today={today} schedules={hub?.schedules ?? []} />
        <LatestPhotoCard slug={slug} />
        <div className="flex gap-2">
          <Button asChild variant="outline" size="lg" className="h-12 rounded-[0.875rem]">
            <Link to="/report/$slug" params={{ slug }}>
              <FileChartColumn className="h-4 w-4" aria-hidden />
              {t("nav.report")}
            </Link>
          </Button>
          <Button asChild size="lg" className="h-12 flex-1 rounded-[0.875rem]">
            <Link to="/messages/$slug" params={{ slug }}>
              <MessageCircle className="h-4 w-4" aria-hidden />
              {nannyCount === 1 && wallet.nannies[0]
                ? t("dash.messageNamed", { name: wallet.nannies[0].name.split(" ")[0]! })
                : t("nav.messages")}
            </Link>
          </Button>
        </div>
        <section>
          <SectionTitle>{t("dash.hoursAndUpdates")}</SectionTitle>
          <MonthOverview slug={slug} schedules={hub?.schedules ?? []} today={today} role="family" />
        </section>
      </div>

      {/* Everything else lives in the menu; home keeps only what has no page of its own. */}
      <div
        className="rise mt-9 grid gap-x-10 gap-y-9 lg:grid-cols-[minmax(0,1fr)_21rem]"
        style={{ "--rise-i": 3 } as CSSProperties}
      >
        <Column>
          <AlertsPrompt slug={slug} />
          <SetupProgress {...props} />
          <Documents {...props} />
          <NannytaxCode code={wallet.nannytaxCode} />
        </Column>

        <Column>
          <NannyProfiles wallet={wallet} />
          <EmergencyContacts wallet={wallet} />
          <SupportBox slug={slug} familyName={wallet.familyName} />
        </Column>
      </div>

      <DashboardFooter
        updatedAt={wallet.updatedAt}
        onLock={onLock}
        billingSlug={hub?.hasSubscription ? slug : undefined}
      />
    </PageContainer>
  );
}

/** This week at a glance: today is the dark pill, and a dot marks the days someone is working. */
function WeekStrip({
  slug,
  today,
  schedules,
}: {
  slug: string;
  /** Today in London, "YYYY-MM-DD". */
  today: string;
  schedules: MonthSchedule[];
}) {
  const t = useT();
  const monday = new Date(`${today}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });
  const fmt = (d: Date, options: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });
  return (
    <Link
      to="/planner/$slug"
      params={{ slug }}
      className="surface-card block p-4 transition-transform duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[0.9375rem] font-semibold text-foreground">
          <CalendarDays className="h-4 w-4" aria-hidden />
          {t("dash.thisWeek")}
        </span>
        <span className="text-[0.8125rem] text-muted-foreground">
          {fmt(days[0]!, { month: "long", year: "numeric" })}
        </span>
      </span>
      <span className="mt-3 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isToday = d.toISOString().slice(0, 10) === today;
          const weekdayName = fmt(d, { weekday: "long" });
          const working = schedules.some((s) =>
            s.workingDays.some((w) => w.day === weekdayName && w.enabled),
          );
          return (
            <span
              key={weekdayName}
              aria-label={`${fmt(d, { weekday: "long", day: "numeric", month: "long" })}${isToday ? ", today" : ""}${working ? ", working day" : ""}`}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2 ${isToday ? "bg-brand text-brand-foreground" : "text-foreground"}`}
            >
              <span
                className={`text-[0.6875rem] font-medium ${isToday ? "opacity-75" : "text-muted-foreground"}`}
                aria-hidden
              >
                {weekdayName.charAt(0)}
              </span>
              <span className="num text-[0.9375rem] font-semibold" aria-hidden>
                {d.getUTCDate()}
              </span>
              <span
                className={`size-1.5 rounded-full ${working ? (isToday ? "bg-gold-soft" : "bg-positive") : "bg-transparent"}`}
                aria-hidden
              />
            </span>
          );
        })}
      </span>
    </Link>
  );
}

function NeedsAttention({
  slug,
  hub,
  agreement,
  agreementDone,
  agreementSubtitle,
  nannyCount,
  outstandingAgreements,
}: DashboardProps) {
  const t = useT();
  const attention = hub?.attention;
  const rows = [];

  if (nannyCount > 1) {
    for (const nanny of outstandingAgreements) {
      rows.push(
        <ActionRow
          key={`agreement-${nanny.id}`}
          slug={slug}
          to="/agreement/$slug"
          icon={FileText}
          tone="attention"
          cta={t("dash.continue")}
          title={t("dash.staffAgreement", { name: nanny.name })}
          detail={
            nanny.agreementStatus === "none"
              ? t("dash.notStarted")
              : nanny.agreementStatus === "draft"
                ? t("dash.draftSavedFinishAndOpen")
                : t("dash.awaitingSignatures")
          }
        />,
      );
    }
  } else if (agreement && !agreementDone) {
    rows.push(
      <ActionRow
        key="agreement"
        slug={slug}
        to="/agreement/$slug"
        icon={FileText}
        tone="attention"
        cta={agreement.hasContent ? t("dash.continue") : t("dash.start")}
        title={
          agreement.hasContent
            ? t("dash.finishYourNannyAgreement")
            : t("dash.buildYourNannyAgreement")
        }
        detail={agreementSubtitle}
      />,
    );
  }
  if (attention?.shiftsPending) {
    rows.push(
      <ActionRow
        key="shifts"
        slug={slug}
        to="/timesheets/$slug"
        icon={Clock3}
        tone="attention"
        cta={t("dash.review")}
        title={t("dash.timesheetsToApprove")}
        detail={t("dash.checkTheHoursThenApprove")}
        badge={<CountBadge count={attention.shiftsPending} />}
      />,
    );
  }
  if (attention?.leavePending) {
    rows.push(
      <ActionRow
        key="leave"
        slug={slug}
        to="/leave/$slug"
        icon={CalendarCheck}
        tone="attention"
        cta={t("dash.review")}
        title={t("dash.leaveRequests")}
        detail={t("dash.yourNannyHasAskedFor")}
        badge={<CountBadge count={attention.leavePending} />}
      />,
    );
  }
  if (attention?.expensesPending) {
    rows.push(
      <ActionRow
        key="expenses"
        slug={slug}
        to="/handover/$slug"
        icon={ReceiptText}
        tone="attention"
        cta={t("dash.review")}
        title={t("dash.expensesToReimburse")}
        detail={t("dash.amountWaiting", { amount: formatMoney(hub?.pendingExpensesTotal ?? 0) })}
        badge={<CountBadge count={attention.expensesPending} />}
      />,
    );
  }
  if (attention?.incidentsOpen) {
    rows.push(
      <ActionRow
        key="incidents"
        slug={slug}
        to="/incidents/$slug"
        icon={ShieldAlert}
        tone="attention"
        cta={t("dash.review")}
        title={t("dash.incidentReportsToSignOff")}
        detail={t("dash.yourNannyHasLoggedSomething")}
        badge={<CountBadge count={attention.incidentsOpen} />}
      />,
    );
  }
  if (attention?.documentsExpired || attention?.documentsExpiring) {
    const expired = attention.documentsExpired ?? 0;
    const soon = attention.documentsExpiring ?? 0;
    rows.push(
      <ActionRow
        key="documents"
        slug={slug}
        to="/safety/$slug"
        icon={ShieldCheck}
        tone="attention"
        cta={t("dash.check")}
        title={
          expired ? t("dash.safetyDocumentsHaveExpired") : t("dash.safetyDocumentsExpiringSoon")
        }
        detail={
          expired
            ? t(soon ? "dash.expiredAndSoon" : "dash.expiredOnly", { expired, soon })
            : t("dash.runningOut", { soon })
        }
        badge={<CountBadge count={expired + soon} />}
      />,
    );
  }
  if (attention?.permissionsUnset) {
    rows.push(
      <ActionRow
        key="permissions"
        slug={slug}
        to="/permissions/$slug"
        icon={ShieldCheck}
        tone="attention"
        cta={t("dash.set")}
        title={t("dash.setYourHouseholdPermissions")}
        detail={t("dash.tellYourNannyWhatIs")}
        badge={<CountBadge count={attention.permissionsUnset} />}
      />,
    );
  }
  if (attention?.unreadThreads) {
    rows.push(
      <ActionRow
        key="messages"
        slug={slug}
        to="/messages/$slug"
        icon={MessageCircle}
        tone="attention"
        cta={t("dash.read")}
        title={t("dash.unreadMessages")}
        detail={t("dash.newRepliesFromYourNanny")}
        badge={<CountBadge count={attention.unreadThreads} />}
      />,
    );
  }

  const showSigning = nannyCount <= 1 && agreement && agreement.hasContent && !agreementDone;
  if (rows.length === 0 && !showSigning) return null;

  return (
    <section>
      <SectionTitle>{t("dash.needsYourAttention")}</SectionTitle>
      <div className="ios-group">{rows}</div>
      {showSigning && (
        <div className="mt-3">
          <SigningProgress
            status={agreement.status}
            version={agreement.version}
            signatures={agreement.signatures}
          />
        </div>
      )}
    </section>
  );
}

function SetupProgress({
  slug,
  hub,
  agreementDone,
  nannyCount,
  agreementsEnabled,
}: DashboardProps) {
  const t = useT();
  return (
    <SetupStatus
      slug={slug}
      items={[
        {
          label: t("dash.nannyAdded"),
          done: nannyCount > 0,
          hint: t("dash.addEveryoneYouEmployWith"),
          to: "/nannies/$slug",
        },
        agreementsEnabled
          ? {
              label: nannyCount > 1 ? t("dash.everyAgreementSigned") : t("dash.agreementSigned"),
              done: agreementDone,
              hint: t("dash.buildItThenBothOf"),
              to: "/agreement/$slug" as const,
            }
          : {
              label: t("dash.workingHoursSet"),
              done: (hub?.schedules ?? []).some((s) => hasHours(s.workingDays)),
              hint: t("dash.theDaysAndHoursYour"),
              to: "/hours/$slug" as const,
            },
        {
          label: t("dash.childrenAdded"),
          done: Boolean(hub?.readiness?.children),
          hint: t("dash.addEachChildSoYour"),
          to: "/family/$slug",
        },
        {
          label: t("dash.allergiesMedication"),
          done: Boolean(hub?.readiness?.allergies),
          hint: t("dash.addAllergiesAndMedicationFor"),
          to: "/family/$slug",
        },
        {
          label: t("dash.emergencyContacts"),
          done: Boolean(hub?.readiness?.contacts),
          hint: t("dash.atLeastOneContactWe"),
          to: "/emergency/$slug",
        },
        {
          label: t("dash.homeAddress"),
          done: Boolean(hub?.readiness?.homeAddress),
          hint: t("dash.neededOnTheEmergencyCard"),
          to: "/emergency/$slug",
        },
        {
          label: t("dash.gpDetails"),
          done: Boolean(hub?.readiness?.gp),
          hint: t("dash.yourFamilyDoctorSName"),
          to: "/emergency/$slug",
        },
        {
          label: t("dash.householdPermissions"),
          done: Boolean(hub?.readiness?.permissions),
          hint: t("dash.sunCreamPhotosWhoCan"),
          to: "/permissions/$slug",
        },
        {
          label: t("dash.houseRules"),
          done: Boolean(hub?.readiness?.houseRules),
          hint: t("dash.screenTimeHomeworkAndThe"),
          to: "/family/$slug",
        },
      ]}
    />
  );
}

function Documents({
  slug,
  wallet,
  agreementSubtitle,
  agreementsEnabled,
  openDoc,
}: DashboardProps) {
  const t = useT();
  const hasDoc = (type: string) => wallet.documents.some((d) => d.docType === type);
  return (
    <section>
      <SectionTitle>{t("dash.documentsChecks")}</SectionTitle>
      <div data-tint="lilac" className="ios-group">
        {agreementsEnabled && (
          <HubTile
            slug={slug}
            to="/agreement/$slug"
            icon={FileText}
            title={t("dash.nannyAgreement")}
            subtitle={agreementSubtitle}
          />
        )}
        <DocTile
          icon={IdCard}
          title={t("dash.yourNannySCv")}
          subtitle={
            hasDoc("cv") ? t("dash.experienceTrainingAndReferences") : t("dash.notAddedYet")
          }
          disabled={!hasDoc("cv")}
          onClick={() => openDoc("cv")}
        />
        {wallet.checks.map((check) => {
          const meta = {
            title: CHECK_LABELS[check.docType] ? t(CHECK_LABELS[check.docType]!) : check.docType,
          };
          const detail = [
            check.issuedOn
              ? t("dash.issued", {
                  date: formatDate(check.issuedOn, { month: "long", year: "numeric" }),
                })
              : null,
            check.referenceLabel,
          ]
            .filter(Boolean)
            .join(" · ");
          if (check.visibility === "badge") {
            return (
              <div key={check.docType} className="flex items-center gap-3 px-4 py-3">
                <span className="ios-icon">
                  <BadgeCheck className="h-4 w-4 text-brand" />
                </span>
                <span>
                  <span className="block font-medium text-foreground">{meta.title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {t("dash.verified")}
                    {detail ? ` · ${detail}` : ""}
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
              subtitle={detail || t("dash.openDocument")}
              onClick={() => openDoc(check.docType)}
            />
          );
        })}
        <a
          href="https://www.acas.org.uk/disciplinary-procedure-step-by-step"
          target="_blank"
          rel="noopener noreferrer"
          className="ios-row"
        >
          <span className="ios-icon">
            <ScrollText className="h-4 w-4" />
          </span>
          <span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              {t("dash.acasDisciplinaryGuidance")}
              <ExternalLink className="h-3.5 w-3.5" />
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {t("dash.officialStepByStepGuidance")}
            </span>
          </span>
        </a>
      </div>
    </section>
  );
}

function NannytaxCode({ code }: { code: string | null }) {
  const t = useT();
  if (!code) return null;
  return (
    <section>
      <SectionTitle>{t("dash.yourNannytaxCode")}</SectionTitle>
      <div className="surface-card p-5">
        <p className="text-sm text-muted-foreground">{t("dash.yourUniqueReferralCodeFrom")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-accent px-3 py-1.5 font-mono text-[0.9375rem] font-medium tracking-wide text-foreground">
            {code}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              toast.success(t("dash.codeCopied"));
            }}
          >
            {t("dash.copyCode")}
          </Button>
          <a
            href="https://www.nannytax.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
          >
            {t("dash.visitNannytax")}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
