import { formatMoney, formatDate } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { AlertsPrompt } from "@/components/dashboard/AlertsPrompt";
import { TodayTimeline } from "@/components/TodayTimeline";
import { SupportBox } from "@/components/SupportBox";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarCheck,
  Camera,
  ClipboardCheck,
  Clock3,
  Coins,
  Dumbbell,
  FileText,
  Heart,
  KeyRound,
  Landmark,
  MessageCircle,
  Baby,
  NotebookPen,
  Pill,
  Plane,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { PageContainer } from "@/components/hub-ui";
import { WalletTravelBanner } from "@/components/WalletTravelBanner";
import { MonthOverview } from "@/components/dashboard/MonthOverview";
import {
  Column,
  DashboardFooter,
  DashboardHeader,
  DemoBanner,
  EmergencyPill,
  EmergencyContacts,
} from "@/components/dashboard/sections";
import {
  ActionRow,
  CountBadge,
  HubTile,
  QuickAction,
  SectionTitle,
} from "@/components/dashboard/tiles";
import { greeting, londonToday, longDate, timeOf } from "@/lib/dashboard-format";
import type { DashboardProps, HubSummary } from "@/components/dashboard/types";
import { useT } from "@/lib/i18n/provider";

export function NannyDashboard(props: DashboardProps) {
  const t = useT();
  const { slug, wallet, hub, agreement, agreementDone, onLock } = props;
  const me = wallet.nannies.find((n) => n.isYou);
  const firstName = me?.name.split(" ")[0];
  const attention = hub?.attention;
  const doses = hub?.recentDoses ?? [];
  const awaiting =
    (attention?.shiftsPending ?? 0) +
    (attention?.leavePending ?? 0) +
    (attention?.expensesPending ?? 0);

  return (
    <PageContainer width="wide">
      <DemoBanner slug={slug} />
      <DashboardHeader
        eyebrow={longDate(hub?.today.date)}
        title={firstName ? `${greeting()}, ${firstName}` : greeting()}
        subtitle={`${/^the\s/i.test(wallet.familyName) ? "" : "The "}${wallet.familyName} household`}
        actions={<EmergencyPill slug={slug} />}
      />
      <WalletTravelBanner slug={slug} />

      <div className="mt-8 space-y-6">
        <TodayTimeline slug={slug} />
        <MonthOverview
          slug={slug}
          schedules={hub?.schedules ?? []}
          today={hub?.today.date ?? londonToday()}
          role="nanny"
        />
      </div>

      <div className="mt-9 grid gap-x-10 gap-y-9 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Column>
          <section>
            <SectionTitle>{t("nd.quickActions")}</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <QuickAction
                slug={slug}
                to="/log/$slug"
                icon={NotebookPen}
                label={t("nd.dailyLog")}
                tint="sage"
                status={hub?.today.logged ? t("nd.doneToday") : t("nd.notWrittenYet")}
                done={hub?.today.logged}
              />
              <QuickAction
                slug={slug}
                to="/medication/$slug"
                icon={Pill}
                label={t("nd.logMedicine")}
                tint="rose"
                status={doses.length ? t("nd.inLast24h", { count: doses.length }) : t("nd.nothingGivenToday")}
              />
              <QuickAction
                slug={slug}
                to="/incidents/$slug"
                icon={ShieldAlert}
                label={t("nd.reportAnIncident")}
                tint="butter"
                status={t("nd.bumpsAndAccidents")}
              />
              <QuickAction
                slug={slug}
                to="/handover/$slug"
                icon={ClipboardCheck}
                label={t("nd.handoverExpenses")}
                tint="apricot"
                status={hub?.today.handedOver ? t("nd.doneToday") : t("nd.endOfDay")}
                done={hub?.today.handedOver}
              />
              <QuickAction
                slug={slug}
                to="/messages/$slug"
                icon={MessageCircle}
                label={t("nd.messages")}
                tint="sky"
                status={
                  attention?.unreadThreads
                    ? t("nd.unreadCount", { count: attention.unreadThreads })
                    : "Message the parents"
                }
              />
              <QuickAction
                slug={slug}
                to="/timesheets/$slug"
                icon={Clock3}
                label={t("nd.addHours")}
                tint="lilac"
                status={t("nd.timesheets")}
              />
              <QuickAction
                slug={slug}
                to="/today/$slug"
                icon={Baby}
                label={t("nd.logTheDay")}
                tint="butter"
                status={t("nd.napsBottlesNappies")}
              />
              <QuickAction
                slug={slug}
                to="/moments/$slug"
                icon={Camera}
                label={t("nd.shareAMoment")}
                tint="butter"
                status={t("nd.photosMilestones")}
              />
            </div>
          </section>

          <ChildrenAtAGlance slug={slug} hub={hub} />

          {doses.length > 0 && (
            <section>
              <SectionTitle>{t("nd.medicineInTheLast24")}</SectionTitle>
              <div data-tint="rose" className="ios-group">
                {doses.map((dose) => (
                  <div key={dose.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="ios-icon">
                      <Pill className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-medium text-foreground">
                        {dose.child_name}: {dose.medicine}
                        {dose.dose ? ` · ${dose.dose}` : ""}
                      </span>
                      <span className="block text-muted-foreground">
                        Given {timeOf(dose.given_at)}
                        {dose.given_by_name ? ` ${t("nd.givenBy", { name: dose.given_by_name })}` : ""}
                        {dose.next_dose_from ? ` · ${t("nd.nextFrom", { time: timeOf(dose.next_dose_from) })}` : ""}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </Column>

        <Column>
          <AlertsPrompt slug={slug} />

          {(awaiting > 0 || (agreement && !agreementDone)) && (
            <section>
              <SectionTitle>{t("nd.waitingOn")}</SectionTitle>
              <div className="ios-group">
                {agreement && !agreementDone && (
                  <ActionRow
                    slug={slug}
                    to="/agreement/$slug"
                    icon={FileText}
                    tone="attention"
                    title={t("nd.yourNannyAgreement")}
                    detail={
                      agreement.status === "issued"
                        ? t("nd.readItAndSignIt")
                        : t("nd.theFamilyIsStillPreparing")
                    }
                  />
                )}
                {attention?.shiftsPending ? (
                  <ActionRow
                    slug={slug}
                    to="/timesheets/$slug"
                    icon={Clock3}
                    title={t("nd.hoursAwaitingApproval")}
                    badge={<CountBadge count={attention.shiftsPending} />}
                  />
                ) : null}
                {attention?.leavePending ? (
                  <ActionRow
                    slug={slug}
                    to="/leave/$slug"
                    icon={CalendarCheck}
                    title={t("nd.leaveAwaitingApproval")}
                    badge={<CountBadge count={attention.leavePending} />}
                  />
                ) : null}
                {attention?.expensesPending ? (
                  <ActionRow
                    slug={slug}
                    to="/handover/$slug"
                    icon={ReceiptText}
                    title={t("nd.expensesToBeRepaid")}
                    detail={`${formatMoney((hub?.pendingExpensesTotal ?? 0))}`}
                    badge={<CountBadge count={attention.expensesPending} />}
                  />
                ) : null}
              </div>
            </section>
          )}

          <EmergencyContacts wallet={wallet} />
          <SupportBox slug={slug} familyName={wallet.familyName} />
        </Column>
      </div>

      <DashboardFooter updatedAt={wallet.updatedAt} onLock={onLock} />
    </PageContainer>
  );
}

/** Each child gets their own colour, in the order the family added them. */
const CHILD_TINTS = ["apricot", "sky", "lilac", "butter", "sage", "rose"] as const;

function ChildrenAtAGlance({ slug, hub }: { slug: string; hub: HubSummary | null }) {
  const t = useT();
  const children = hub?.children ?? [];
  if (children.length === 0) return null;
  return (
    <section>
      <SectionTitle
        action={
          <Link
            to="/emergency/$slug"
            params={{ slug }}
            className="text-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
          >{t("dash.emergencyCard")}</Link>
        }
      >{t("nd.theChildren")}</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {children.map((child, i) => (
          <div
            key={child.id}
            data-tint={CHILD_TINTS[i % CHILD_TINTS.length]}
            className="surface-card flex items-start gap-3 p-4"
          >
            <span className="ios-icon h-10 w-10 rounded-full font-serif text-lg" aria-hidden="true">
              {child.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">{child.name}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {child.allergies ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="h-3 w-3" /> {child.allergies}
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{t("nd.noAllergiesNoted")}</span>
                )}
                {child.medication && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-foreground">
                    <Pill className="h-3 w-3" /> {child.medication}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
