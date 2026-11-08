import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BadgeCheck, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, EmptyState, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import {
  acknowledgeIncidentFn,
  addIncidentFn,
  deleteIncidentFn,
  getIncidents,
} from "@/lib/incidents.functions";
import {
  INCIDENT_KINDS,
  INCIDENT_SEVERITIES,
  type IncidentKind,
  type IncidentSeverity,
} from "@/lib/incidents.types";

export const Route = createFileRoute("/incidents/$slug")({
  head: () => ({
    meta: [
      { title: "Accident & incident reports | The Family Wallet" },
      {
        name: "description",
        content:
          "A shared record of bumps, accidents and incidents, with what was done and a parent's sign-off.",
      },
      { property: "og:title", content: "Accident & incident reports" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IncidentsPage,
});

function localNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const selectClass =
  "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function IncidentsPage() {
  const { slug } = Route.useParams();
  const loadFn = useServerFn(getIncidents);
  const addFn = useServerFn(addIncidentFn);
  const ackFn = useServerFn(acknowledgeIncidentFn);
  const removeFn = useServerFn(deleteIncidentFn);

  const query = useQuery({
    queryKey: ["incidents", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });
  const data = query.data;

  const [childName, setChildName] = useState("");
  const [occurredAt, setOccurredAt] = useState(localNow());
  const [kind, setKind] = useState<IncidentKind>("accident");
  const [severity, setSeverity] = useState<IncidentSeverity>("minor");
  const [whatHappened, setWhatHappened] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [parentsTold, setParentsTold] = useState(false);
  const [saving, setSaving] = useState(false);

  if (query.isLoading) return null;
  if (!data) return <LockedNotice slug={slug} />;

  const isParent = data.access === "family";
  const chosenChild = childName || data.children[0] || "";
  const waiting = data.incidents.filter((i) => !i.acknowledgedAt);

  const submit = async () => {
    setSaving(true);
    try {
      await addFn({
        data: {
          slug,
          incident: {
            childName: chosenChild,
            occurredAt: new Date(occurredAt).toISOString(),
            kind,
            severity,
            whatHappened,
            actionTaken: actionTaken || undefined,
            parentsTold,
          },
        },
      });
      setWhatHappened("");
      setActionTaken("");
      setParentsTold(false);
      setOccurredAt(localNow());
      await query.refetch();
      toast.success("Report saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the report");
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      await query.refetch();
      toast.success(done);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <HubPage
      slug={slug}
      title="Accident & incident reports"
      intro="A clear record of any bump, accident or incident: what happened, what was done, and that a parent has seen it."
    >
      {isParent && waiting.length > 0 && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-foreground">
            <ShieldAlert className="mr-1.5 inline h-4 w-4 text-destructive" />
            {waiting.length} report{waiting.length === 1 ? "" : "s"} waiting for your sign-off
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Read each one below, then tap Sign off to confirm you have seen it.
          </p>
        </div>
      )}

      <Card>
        <h2 className="heading-display text-lg text-foreground">Report an incident</h2>
        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Which child</span>
            {data.children.length > 0 ? (
              <select
                className={selectClass}
                value={chosenChild}
                onChange={(e) => setChildName(e.target.value)}
              >
                {data.children.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={selectClass}
                value={childName}
                placeholder="Child's name"
                onChange={(e) => setChildName(e.target.value)}
              />
            )}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-foreground">What kind</span>
              <select
                className={selectClass}
                value={kind}
                onChange={(e) => setKind(e.target.value as IncidentKind)}
              >
                {INCIDENT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="When it happened"
              type="datetime-local"
              value={occurredAt}
              onChange={setOccurredAt}
            />
          </div>
          <label className="block">
            <span className="text-sm font-medium text-foreground">How serious</span>
            <select
              className={selectClass}
              value={severity}
              onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
            >
              {INCIDENT_SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="What happened"
            textarea
            value={whatHappened}
            placeholder="Where, how, and what the child was doing"
            onChange={setWhatHappened}
          />
          <Field
            label="What you did"
            textarea
            value={actionTaken}
            placeholder="First aid, who you called, how they were afterwards"
            onChange={setActionTaken}
          />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={parentsTold}
              onChange={(e) => setParentsTold(e.target.checked)}
            />
            I have already told a parent
          </label>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          For anything serious, call 999 or a parent first and write this up afterwards.
        </p>
        <Button className="mt-4" disabled={saving} onClick={submit}>
          <ShieldAlert className="h-4 w-4" /> Save report
        </Button>
      </Card>

      <h2 className="heading-display mt-8 text-xl text-foreground">Reports</h2>
      <div className="mt-3 space-y-3">
        {data.incidents.length === 0 && (
          <EmptyState
            icon={ShieldAlert}
            title="No reports yet"
            description="Nothing to report is good news. If anything happens it is recorded here with the time and who saw it."
          />
        )}
        {data.incidents.map((i) => {
          const kindLabel = INCIDENT_KINDS.find((k) => k.value === i.kind)?.label ?? i.kind;
          const severityLabel =
            INCIDENT_SEVERITIES.find((s) => s.value === i.severity)?.label ?? i.severity;
          return (
            <Card key={i.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {i.childName} · {kindLabel}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatWhen(i.occurredAt)} · {severityLabel} · reported by{" "}
                    {i.reportedByName || i.reportedBy}
                  </p>
                  <p className="mt-2 text-sm text-foreground">{i.whatHappened}</p>
                  {i.actionTaken && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Done:</span> {i.actionTaken}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {i.parentsTold ? "A parent was told at the time." : "A parent was not yet told."}
                  </p>
                  {i.acknowledgedAt ? (
                    <p className="mt-2 text-sm font-medium text-primary">
                      <BadgeCheck className="mr-1 inline h-4 w-4" />
                      Signed off by {i.acknowledgedByName || "a parent"} on{" "}
                      {formatWhen(i.acknowledgedAt)}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-destructive">
                      Waiting for a parent to sign off
                    </p>
                  )}
                </div>
                {isParent && (
                  <div className="flex gap-2">
                    {!i.acknowledgedAt && (
                      <Button
                        size="sm"
                        onClick={() =>
                          act(() => ackFn({ data: { slug, id: i.id } }), "Report signed off")
                        }
                      >
                        Sign off
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Remove report"
                      onClick={() =>
                        act(() => removeFn({ data: { slug, id: i.id } }), "Report removed")
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </HubPage>
  );
}
