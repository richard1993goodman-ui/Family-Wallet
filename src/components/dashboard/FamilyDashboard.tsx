import { formatDate, formatMoney } from "@/lib/format";
import { AgreementChoice } from "@/components/AgreementChoice";
import { Link } from "@tanstack/react-router";
import { AlertsPrompt } from "@/components/dashboard/AlertsPrompt";
import { TodayTimeline } from "@/components/TodayTimeline";
import { SupportBox } from "@/components/SupportBox";
import { NextStep } from "@/components/dashboard/NextStep";
import { hasHours } from "@/lib/work-hours";
import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  Calculator,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  ExternalLink,
  FileBarChart,
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
  DashboardHeader,
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
  const { slug, wallet, hub, onLock } = props;

  return (
    <PageContainer width="wide">
      <DemoBanner slug={slug} />
      <EmergencyPill slug={slug} />
      <DashboardHeader
        eyebrow={longDate(hub?.today.date)}
        title={greeting()}
        subtitle={`${wallet.familyName}${wallet.agencyName ? ` · ${t("shell.withAgency", { agency: wallet.agencyName })}` : ""}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/report/$slug" params={{ slug }}>
                <FileBarChart className="h-4 w-4" />{t("dash.weeklyReport")}</Link>
            </Button>
            <Button asChild>
              <Link to="/messages/$slug" params={{ slug }}>
                <MessageCircle className="h-4 w-4" />{t("dash.messageYourNanny")}</Link>
            </Button>
          </>
        }
      />
      <WalletTravelBanner slug={slug} />

      <div className="mt-8 space-y-6">
        <TodayTimeline slug={slug} />
        <AgreementChoice slug={slug} firstSignIn />
        <MonthOverview
          slug={slug}
          schedules={hub?.schedules ?? []}
          today={hub?.today.date ?? londonToday()}
          role="family"
        />
        <NextStep {...props} />
        <NeedsAttention {...props} />
      </div>

      {/* Everything else lives in the menu; home keeps only what has no page of its own. */}
      <div className="mt-9 grid gap-x-10 gap-y-9 lg:grid-cols-[minmax(0,1fr)_21rem]">
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
        title={agreement.hasContent ? t("dash.finishYourNannyAgreement") : t("dash.buildYourNannyAgreement")}
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
        title={expired ? t("dash.safetyDocumentsHaveExpired") : t("dash.safetyDocumentsExpiringSoon")}
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
          subtitle={hasDoc("cv") ? t("dash.experienceTrainingAndReferences") : t("dash.notAddedYet")}
          disabled={!hasDoc("cv")}
          onClick={() => openDoc("cv")}
        />
        {wallet.checks.map((check) => {
          const meta = { title: CHECK_LABELS[check.docType] ? t(CHECK_LABELS[check.docType]!) : check.docType };
          const detail = [
            check.issuedOn
              ? t("dash.issued", { date: formatDate(check.issuedOn, { month: "long", year: "numeric" }) })
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
                    {t("dash.verified")}{detail ? ` · ${detail}` : ""}
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
            <span className="flex items-center gap-1.5 font-medium text-foreground">{t("dash.acasDisciplinaryGuidance")}<ExternalLink className="h-3.5 w-3.5" />
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">{t("dash.officialStepByStepGuidance")}</span>
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
          >{t("dash.copyCode")}</Button>
          <a
            href="https://www.nannytax.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
          >{t("dash.visitNannytax")}<ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
