import { Link } from "@tanstack/react-router";
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
import { WalletChallenges } from "@/components/WalletChallenges";
import { WalletTravelBanner } from "@/components/WalletTravelBanner";
import { Button } from "@/components/ui/button";
import { SetupStatus } from "@/components/dashboard/SetupStatus";
import { WeekCalendar } from "@/components/dashboard/WeekCalendar";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import {
  Column,
  DashboardFooter,
  DashboardHeader,
  DemoBanner,
  EmergencyCardLink,
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
import { greeting, longDate, shortDate } from "@/lib/dashboard-format";
import type { DashboardProps } from "@/components/dashboard/types";

const CHECK_LABELS: Record<string, { title: string }> = {
  dbs: { title: "DBS certificate" },
  id_check: { title: "ID & right to work" },
  reference_1: { title: "Reference" },
  reference_2: { title: "Reference" },
};

export function FamilyDashboard(props: DashboardProps) {
  const { slug, wallet, hub, onLock } = props;

  return (
    <PageContainer width="wide">
      <DemoBanner slug={slug} />
      <DashboardHeader
        eyebrow={longDate(hub?.today.date)}
        title={greeting()}
        subtitle={`${wallet.familyName}${wallet.agencyName ? ` · with ${wallet.agencyName}` : ""}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/report/$slug" params={{ slug }}>
                <FileBarChart className="h-4 w-4" /> Weekly report
              </Link>
            </Button>
            <Button asChild>
              <Link to="/messages/$slug" params={{ slug }}>
                <MessageCircle className="h-4 w-4" /> Message your nanny
              </Link>
            </Button>
          </>
        }
      />
      <WalletTravelBanner slug={slug} />

      <div className="mt-9 grid gap-x-10 gap-y-9 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Column>
          <NeedsAttention {...props} />
          <SetupProgress {...props} />
          <WelcomeCard slug={slug} />

          <section>
            <SectionTitle>This week</SectionTitle>
            <WeekCalendar
              slug={slug}
              entries={hub?.entries ?? []}
              schedules={hub?.schedules ?? []}
            />
          </section>

          <LatestUpdates {...props} />

          <section>
            <SectionTitle>Activities</SectionTitle>
            <WalletChallenges slug={slug} />
            <div data-tint="butter" className="ios-group mt-2">
              <HubTile
                slug={slug}
                to="/passport/$slug"
                icon={Dumbbell}
                title="Active Kids Passport"
                subtitle={
                  hub?.latestPassport
                    ? `${hub.latestPassport.child_name}: ${hub.latestPassport.activity}`
                    : "Sports skills, challenges and confidence wins"
                }
              />
            </div>
          </section>

          <section>
            <SectionTitle>Employing your nanny</SectionTitle>
            <div data-tint="sky" className="link-grid sm:grid-cols-2">
              <HubTile
                slug={slug}
                to="/payroll/$slug"
                icon={Briefcase}
                title="Payroll setup"
                subtitle="A guided Nannytax introduction"
              />
              <HubTile
                slug={slug}
                to="/costs/$slug"
                icon={Calculator}
                title="Employment costs"
                subtitle="Pay, employer NI and pension"
              />
              <HubTile
                slug={slug}
                to="/bankdetails/$slug"
                icon={Landmark}
                title="Nanny bank details"
                subtitle="Account details for paying your nanny"
              />
              <HubTile
                slug={slug}
                to="/training/$slug"
                icon={GraduationCap}
                title="Nanny training"
                subtitle="Routine, safeguarding and emergencies"
              />
              <HubTile
                slug={slug}
                to="/safety/$slug"
                icon={ShieldCheck}
                title="Insurance & safeguarding"
                subtitle="Checks, training and insurance records"
              />
              <HubTile
                slug={slug}
                to="/incidents/$slug"
                icon={ShieldAlert}
                title="Accident & incident reports"
                subtitle="What happened, what was done, signed off"
              />
              <HubTile
                slug={slug}
                to="/permissions/$slug"
                icon={ShieldCheck}
                title="Permissions & consents"
                subtitle="What is fine, what needs asking, who can collect"
              />
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
                    ACAS disciplinary guidance <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Official step-by-step guidance
                  </span>
                </span>
              </a>
            </div>
          </section>
        </Column>

        <Column>
          <EmergencyCardLink slug={slug} />
          <NannyProfiles wallet={wallet} />

          <section>
            <SectionTitle>Family &amp; home</SectionTitle>
            <div data-tint="apricot" className="ios-group">
              <HubTile
                slug={slug}
                to="/family/$slug"
                icon={Users}
                title="Children & routines"
                subtitle={
                  hub?.childCount
                    ? `${hub.childCount} child${hub.childCount === 1 ? "" : "ren"} added`
                    : "Children, routines, allergies and house rules"
                }
              />
              <HubTile
                slug={slug}
                to="/kids/$slug"
                icon={Heart}
                title="Kids' playbook"
                subtitle="Comforts, big moments and rainy-day ideas"
              />
              <HubTile
                slug={slug}
                to="/housemanual/$slug"
                icon={KeyRound}
                title="House manual & codes"
                subtitle="WiFi, alarm, lockbox and everyday instructions"
              />
              <HubTile
                slug={slug}
                to="/guide/$slug"
                icon={BookOpen}
                title="Nanny quick guide"
                subtitle="A one-page summary for your nanny"
              />
            </div>
          </section>

          <Documents {...props} />
          <EmergencyContacts wallet={wallet} />
          <NannytaxCode code={wallet.nannytaxCode} />
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
          cta="Continue"
          title={`${nanny.name}'s agreement`}
          detail={
            nanny.agreementStatus === "none"
              ? "Not started"
              : nanny.agreementStatus === "draft"
                ? "Draft saved — finish and open for signing"
                : "Awaiting signatures"
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
        cta={agreement.hasContent ? "Continue" : "Start"}
        title={agreement.hasContent ? "Finish your nanny agreement" : "Build your nanny agreement"}
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
        cta="Review"
        title="Timesheets to approve"
        detail="Check the hours, then approve for payment"
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
        cta="Review"
        title="Leave requests"
        detail="Your nanny has asked for time off"
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
        cta="Review"
        title="Expenses to reimburse"
        detail={`£${(hub?.pendingExpensesTotal ?? 0).toFixed(2)} waiting`}
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
        cta="Review"
        title="Incident reports to sign off"
        detail="Your nanny has logged something for you to see"
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
        cta="Check"
        title={expired ? "Safety documents have expired" : "Safety documents expiring soon"}
        detail={
          expired
            ? `${expired} expired${soon ? `, ${soon} more running out` : ""}. Ask your agency to renew.`
            : `${soon} running out in the next 60 days`
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
        cta="Set"
        title="Set your household permissions"
        detail="Tell your nanny what is fine without asking"
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
        cta="Read"
        title="Unread messages"
        detail="New replies from your nanny"
        badge={<CountBadge count={attention.unreadThreads} />}
      />,
    );
  }

  const showSigning = nannyCount <= 1 && agreement && agreement.hasContent && !agreementDone;

  return (
    <section>
      <SectionTitle>Needs your attention</SectionTitle>
      <div className="ios-group">
        {rows.length > 0 ? (
          rows
        ) : (
          <div className="flex items-center gap-3 px-4 py-4">
            <CheckCircle2 className="h-4 w-4 flex-none text-brand" />
            <span>
              <span className="block font-medium text-foreground">You're all caught up</span>
              <span className="block text-sm text-muted-foreground">
                Approvals, requests and new messages will appear here.
              </span>
            </span>
          </div>
        )}
      </div>
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

function SetupProgress({ slug, hub, agreementDone, nannyCount }: DashboardProps) {
  return (
    <SetupStatus
      slug={slug}
      items={[
        {
          label: "Nanny added",
          done: nannyCount > 0,
          hint: "Add everyone you employ with us",
          to: "/nannies/$slug",
        },
        {
          label: nannyCount > 1 ? "Every nanny agreement signed" : "Nanny agreement signed",
          done: agreementDone,
          hint: "Build it, then both of you sign it",
          to: "/agreement/$slug",
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
          label: "Household permissions",
          done: Boolean(hub?.readiness?.permissions),
          hint: "Sun cream, photos, who can collect and more",
          to: "/permissions/$slug",
        },
        {
          label: "House rules",
          done: Boolean(hub?.readiness?.houseRules),
          hint: "Screen time, homework and the basics",
          to: "/family/$slug",
        },
      ]}
    />
  );
}

function LatestUpdates({ slug, hub }: DashboardProps) {
  const log = hub?.latestLog;
  const doses = hub?.recentDoses ?? [];
  return (
    <section>
      <SectionTitle>Latest from your nanny</SectionTitle>
      <div className="ios-group">
        <ActionRow
          slug={slug}
          to="/log/$slug"
          icon={NotebookPen}
          title="Daily log"
          detail={
            log
              ? `${hub?.today.logged ? "Today" : shortDate(log.log_date)}${log.mood ? ` · ${log.mood}` : ""}${log.activities ? ` · ${log.activities}` : ""}`
              : "End-of-day updates will appear here"
          }
          tone={hub?.today.logged ? "done" : "default"}
        />
        <ActionRow
          slug={slug}
          to="/handover/$slug"
          icon={ClipboardCheck}
          title="Handover"
          detail={
            hub?.latestHandover
              ? hub.today.handedOver
                ? "Handed over today"
                : `Last handover ${shortDate(hub.latestHandover.handover_date)}`
              : "Doorstep wrap-up and tomorrow's kit"
          }
          tone={hub?.today.handedOver ? "done" : "default"}
        />
        <ActionRow
          slug={slug}
          to="/medication/$slug"
          icon={Pill}
          title="Medication"
          detail={
            doses.length
              ? `${doses.length} dose${doses.length === 1 ? "" : "s"} in the last 24 hours · latest ${doses[0]!.medicine} for ${doses[0]!.child_name}`
              : "No doses in the last 24 hours"
          }
        />
        <ActionRow
          slug={slug}
          to="/moments/$slug"
          icon={Camera}
          title="Photo moments"
          detail="Photos and milestones from the week"
        />
        <ActionRow
          slug={slug}
          to="/report/$slug"
          icon={FileBarChart}
          title="Weekly report"
          detail="Hours, activities, handovers and expenses"
        />
      </div>
    </section>
  );
}

function Documents({ slug, wallet, agreementSubtitle, openDoc }: DashboardProps) {
  const hasDoc = (type: string) => wallet.documents.some((d) => d.docType === type);
  return (
    <section>
      <SectionTitle>Documents &amp; checks</SectionTitle>
      <div data-tint="lilac" className="ios-group">
        <HubTile
          slug={slug}
          to="/agreement/$slug"
          icon={FileText}
          title="Nanny agreement"
          subtitle={agreementSubtitle}
        />
        <DocTile
          icon={IdCard}
          title="Your nanny's CV"
          subtitle={hasDoc("cv") ? "Experience, training and references" : "Not added yet"}
          disabled={!hasDoc("cv")}
          onClick={() => openDoc("cv")}
        />
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
              <div key={check.docType} className="flex items-center gap-3 px-4 py-3">
                <span className="ios-icon">
                  <BadgeCheck className="h-4 w-4 text-brand" />
                </span>
                <span>
                  <span className="block font-medium text-foreground">{meta.title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    Verified{detail ? ` · ${detail}` : ""}
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
    </section>
  );
}

function NannytaxCode({ code }: { code: string | null }) {
  if (!code) return null;
  return (
    <section>
      <SectionTitle>Your Nannytax code</SectionTitle>
      <div className="surface-card p-5">
        <p className="text-sm text-muted-foreground">
          Use this referral code when you set up payroll with Nannytax.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-accent px-3 py-1.5 font-mono text-[0.9375rem] font-medium tracking-wide text-foreground">
            {code}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              toast.success("Code copied");
            }}
          >
            Copy code
          </Button>
          <a
            href="https://www.nannytax.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
          >
            Visit Nannytax <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
