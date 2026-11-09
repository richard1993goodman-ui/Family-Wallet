import { Link } from "@tanstack/react-router";
import { AlertsPrompt } from "@/components/dashboard/AlertsPrompt";
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
import { Button } from "@/components/ui/button";
import { WalletTravelBanner } from "@/components/WalletTravelBanner";
import { WeekCalendar } from "@/components/dashboard/WeekCalendar";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import {
  Column,
  DashboardFooter,
  DashboardHeader,
  DemoBanner,
  EmergencyCardLink,
  EmergencyContacts,
} from "@/components/dashboard/sections";
import {
  ActionRow,
  CountBadge,
  HubTile,
  QuickAction,
  SectionTitle,
} from "@/components/dashboard/tiles";
import { greeting, longDate, timeOf } from "@/lib/dashboard-format";
import type { DashboardProps, HubSummary } from "@/components/dashboard/types";

export function NannyDashboard(props: DashboardProps) {
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
        actions={
          <Button asChild>
            <Link to="/log/$slug" params={{ slug }}>
              <NotebookPen className="h-4 w-4" />
              {hub?.today.logged ? "Update today's log" : "Write today's log"}
            </Link>
          </Button>
        }
      />
      <WalletTravelBanner slug={slug} />

      <div className="mt-9 grid gap-x-10 gap-y-9 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Column>
          <TodayShift hub={hub} />

          <section>
            <SectionTitle>Quick actions</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <QuickAction
                slug={slug}
                to="/log/$slug"
                icon={NotebookPen}
                label="Daily log"
                tint="sage"
                status={hub?.today.logged ? "Done today" : "Not written yet"}
                done={hub?.today.logged}
              />
              <QuickAction
                slug={slug}
                to="/medication/$slug"
                icon={Pill}
                label="Log medicine"
                tint="rose"
                status={doses.length ? `${doses.length} in last 24h` : "Nothing given today"}
              />
              <QuickAction
                slug={slug}
                to="/incidents/$slug"
                icon={ShieldAlert}
                label="Report an incident"
                tint="butter"
                status="Bumps and accidents"
              />
              <QuickAction
                slug={slug}
                to="/handover/$slug"
                icon={ClipboardCheck}
                label="Handover & expenses"
                tint="apricot"
                status={hub?.today.handedOver ? "Done today" : "End of day"}
                done={hub?.today.handedOver}
              />
              <QuickAction
                slug={slug}
                to="/messages/$slug"
                icon={MessageCircle}
                label="Messages"
                tint="sky"
                status={
                  attention?.unreadThreads
                    ? `${attention.unreadThreads} unread`
                    : "Message the parents"
                }
              />
              <QuickAction
                slug={slug}
                to="/timesheets/$slug"
                icon={Clock3}
                label="Add hours"
                tint="lilac"
                status="Timesheets"
              />
              <QuickAction
                slug={slug}
                to="/today/$slug"
                icon={Baby}
                label="Log the day"
                tint="butter"
                status="Naps, bottles, nappies"
              />
              <QuickAction
                slug={slug}
                to="/moments/$slug"
                icon={Camera}
                label="Share a moment"
                tint="butter"
                status="Photos & milestones"
              />
            </div>
          </section>

          <ChildrenAtAGlance slug={slug} hub={hub} />

          {doses.length > 0 && (
            <section>
              <SectionTitle>Medicine in the last 24 hours</SectionTitle>
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
                        {dose.given_by_name ? ` by ${dose.given_by_name}` : ""}
                        {dose.next_dose_from ? ` · next from ${timeOf(dose.next_dose_from)}` : ""}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle>This week</SectionTitle>
            <WeekCalendar
              slug={slug}
              entries={hub?.entries ?? []}
              schedules={hub?.schedules ?? []}
            />
          </section>
        </Column>

        <Column>
          <AlertsPrompt slug={slug} />
          <EmergencyCardLink slug={slug} />

          {(awaiting > 0 || (agreement && !agreementDone)) && (
            <section>
              <SectionTitle>Waiting on</SectionTitle>
              <div className="ios-group">
                {agreement && !agreementDone && (
                  <ActionRow
                    slug={slug}
                    to="/agreement/$slug"
                    icon={FileText}
                    tone="attention"
                    title="Your nanny agreement"
                    detail={
                      agreement.status === "issued"
                        ? "Read it and sign it here"
                        : "The family is still preparing it"
                    }
                  />
                )}
                {attention?.shiftsPending ? (
                  <ActionRow
                    slug={slug}
                    to="/timesheets/$slug"
                    icon={Clock3}
                    title="Hours awaiting approval"
                    badge={<CountBadge count={attention.shiftsPending} />}
                  />
                ) : null}
                {attention?.leavePending ? (
                  <ActionRow
                    slug={slug}
                    to="/leave/$slug"
                    icon={CalendarCheck}
                    title="Leave awaiting approval"
                    badge={<CountBadge count={attention.leavePending} />}
                  />
                ) : null}
                {attention?.expensesPending ? (
                  <ActionRow
                    slug={slug}
                    to="/handover/$slug"
                    icon={ReceiptText}
                    title="Expenses to be repaid"
                    detail={`£${(hub?.pendingExpensesTotal ?? 0).toFixed(2)}`}
                    badge={<CountBadge count={attention.expensesPending} />}
                  />
                ) : null}
              </div>
            </section>
          )}

          <WelcomeCard slug={slug} />

          <section>
            <SectionTitle>The family</SectionTitle>
            <div data-tint="apricot" className="ios-group">
              <HubTile
                slug={slug}
                to="/housemanual/$slug"
                icon={KeyRound}
                title="House manual & codes"
                subtitle="WiFi, alarm, lockbox and everyday instructions"
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
                to="/permissions/$slug"
                icon={ShieldCheck}
                title="What's allowed"
                subtitle="Permissions and who can collect the children"
              />
              <HubTile
                slug={slug}
                to="/passport/$slug"
                icon={Dumbbell}
                title="Active Kids Passport"
                subtitle="Sports skills, challenges and confidence wins"
              />
              <HubTile
                slug={slug}
                to="/welcome/$slug"
                icon={Sparkles}
                title="First 48 hours"
                subtitle="Routines, pickups and your first handover"
              />
              <HubTile
                slug={slug}
                to="/travel/$slug"
                icon={Plane}
                title="Travel pack"
                subtitle="Checklists and local emergency info"
              />
            </div>
          </section>

          <section>
            <SectionTitle>My work</SectionTitle>
            <div data-tint="sky" className="ios-group">
              <HubTile
                slug={slug}
                to="/leave/$slug"
                icon={CalendarCheck}
                title="Holiday & leave"
                subtitle="Your entitlement and time off"
              />
              <HubTile
                slug={slug}
                to="/pettycash/$slug"
                icon={Coins}
                title="Petty cash"
                subtitle="Money added, spent and left"
              />
              <HubTile
                slug={slug}
                to="/bankdetails/$slug"
                icon={Landmark}
                title="Your bank details"
                subtitle="Where your family pays you"
              />
              <HubTile
                slug={slug}
                to="/training/$slug"
                icon={BadgeCheck}
                title="Nanny training"
                subtitle="20 questions, with a certificate"
              />
              <HubTile
                slug={slug}
                to="/safety/$slug"
                icon={ShieldCheck}
                title="Safety records"
                subtitle="Your checks, training and insurance"
              />
            </div>
          </section>

          <EmergencyContacts wallet={wallet} />
        </Column>
      </div>

      <DashboardFooter updatedAt={wallet.updatedAt} onLock={onLock} />
    </PageContainer>
  );
}

function TodayShift({ hub }: { hub: HubSummary | null }) {
  if (!hub) return null;
  const todayIso = hub.today.date;
  const dayName = new Date(`${todayIso}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: "UTC",
  });
  const mine = hub.schedules.find((s) => s.nannyId === hub.nannyId) ?? hub.schedules[0];
  const shift = mine?.workingDays.find((d) => d.day === dayName && d.enabled);
  const todays = hub.entries.filter((e) => e.entry_date === todayIso);
  const cancelled = todays.some((e) => e.entry_type === "shift_change" && e.status === "cancelled");
  const plans = todays.filter((e) => e.entry_type !== "shift_change");

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b border-rule px-5 py-4">
        <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
          Your shift today
        </p>
        <p className="num heading-display mt-1 text-[1.75rem] text-foreground">
          {cancelled
            ? "Shift cancelled"
            : shift
              ? `${shift.startTime}–${shift.endTime}${shift.startTime2 && shift.endTime2 ? ` and ${shift.startTime2}–${shift.endTime2}` : ""}`
              : "Not a regular working day"}
        </p>
      </div>
      <div className="px-5 py-4">
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing else planned for today.</p>
        ) : (
          <ul className="space-y-2">
            {plans.map((entry) => (
              <li key={entry.id} className="flex gap-3 text-sm">
                <span className="w-24 flex-none font-medium text-primary">
                  {entry.time_label ?? "Any time"}
                  {entry.end_time_label ? `–${entry.end_time_label}` : ""}
                </span>
                <span className="text-foreground">
                  {entry.title}
                  {entry.child_name ? (
                    <span className="text-muted-foreground"> · {entry.child_name}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Each child gets their own colour, in the order the family added them. */
const CHILD_TINTS = ["apricot", "sky", "lilac", "butter", "sage", "rose"] as const;

function ChildrenAtAGlance({ slug, hub }: { slug: string; hub: HubSummary | null }) {
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
          >
            Emergency card
          </Link>
        }
      >
        The children
      </SectionTitle>
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
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    No allergies noted
                  </span>
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
