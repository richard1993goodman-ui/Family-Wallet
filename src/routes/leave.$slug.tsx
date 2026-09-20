import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Plane, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { cancelLeaveFn, getLeave, requestLeaveFn, reviewLeaveFn } from "@/lib/leave.functions";
import { LEAVE_TYPES, type LeaveType } from "@/lib/leave.types";

export const Route = createFileRoute("/leave/$slug")({
  head: () => ({
    meta: [
      { title: "Holiday & leave — Athlete Mannies & Nannies" },
      {
        name: "description",
        content: "Track your nanny's holiday entitlement, book time off and approve leave requests.",
      },
      { property: "og:title", content: "Holiday & leave — Athlete Mannies & Nannies" },
      { property: "og:description", content: "Holiday entitlement and leave requests in your family wallet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeavePage,
});

const today = () => new Date().toISOString().slice(0, 10);

function LeavePage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const loadFn = useServerFn(getLeave);
  const requestFn = useServerFn(requestLeaveFn);
  const reviewFn = useServerFn(reviewLeaveFn);
  const removeFn = useServerFn(cancelLeaveFn);

  const query = useQuery({ queryKey: ["leave", slug], queryFn: () => loadFn({ data: { slug } }) });
  const data = query.data;

  const [nannyId, setNannyId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("holiday");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!nannyId && data?.nannies.length) setNannyId(data.nannies[0]!.nannyId);
  }, [data, nannyId]);

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!data) return <LockedNotice slug={slug} />;

  const isFamily = data.access === "family";
  const refresh = () => client.invalidateQueries({ queryKey: ["leave", slug] });

  const submit = async () => {
    if (!nannyId) {
      toast.error("Add a nanny first.");
      return;
    }
    setSaving(true);
    try {
      const result = await requestFn({
        data: { slug, leave: { nannyId, leaveType, startDate, endDate, notes } },
      });
      setNotes("");
      await refresh();
      toast.success(
        result.autoApproved
          ? `${result.days} day${result.days === 1 ? "" : "s"} booked`
          : `Request sent — ${result.days} day${result.days === 1 ? "" : "s"}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <HubPage
      slug={slug}
      title="Holiday & leave"
      intro={`Entitlement is worked out from each nanny agreement. Leave year ${data.leaveYear.label}.`}
    >
      <div className="space-y-3">
        {data.nannies.length === 0 && (
          <Card>
            <p className="text-sm text-muted-foreground">
              Add a nanny and complete their agreement to see holiday entitlement here.
            </p>
          </Card>
        )}
        {data.nannies.map((nanny) => (
          <Card key={nanny.nannyId}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{nanny.nannyName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nanny.hasAgreement
                    ? `${nanny.entitlementDays} days a year (${nanny.entitlementWeeks} weeks × ${nanny.workingDaysPerWeek} days)`
                    : "No signed agreement yet — entitlement will appear once it is completed."}
                </p>
              </div>
              <div className="text-right">
                <p className="heading-display text-2xl text-foreground">{nanny.remainingDays}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">days left</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <Stat label="Taken" value={nanny.takenDays} />
              <Stat label="Awaiting approval" value={nanny.pendingDays} />
              <Stat label="Sick days" value={nanny.sickDays} />
            </div>
          </Card>
        ))}
      </div>

      {data.nannies.length > 0 && (
        <div className="mt-6">
          <Card>
            <h2 className="heading-display text-lg text-foreground">
              {isFamily ? "Book time off" : "Request time off"}
            </h2>
            {data.nannies.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.nannies.map((nanny) => (
                  <button
                    key={nanny.nannyId}
                    type="button"
                    onClick={() => setNannyId(nanny.nannyId)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      nannyId === nanny.nannyId
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-foreground"
                    }`}
                  >
                    {nanny.nannyName}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {LEAVE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setLeaveType(type.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    leaveType === type.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="First day" type="date" value={startDate} onChange={setStartDate} />
              <Field label="Last day" type="date" value={endDate} onChange={setEndDate} />
            </div>
            <div className="mt-4">
              <Field label="Notes (optional)" textarea value={notes} onChange={setNotes} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Only the nanny's agreed working days inside these dates are counted.
            </p>
            <Button className="mt-4" disabled={saving} onClick={submit}>
              <Plane className="h-4 w-4" /> {isFamily ? "Book leave" : "Send request"}
            </Button>
          </Card>
        </div>
      )}

      <h2 className="heading-display mt-8 text-xl text-foreground">Leave this year</h2>
      <div className="mt-3 space-y-3">
        {data.requests.length === 0 && (
          <p className="text-sm text-muted-foreground">No leave booked yet this leave year.</p>
        )}
        {data.requests.map((request) => (
          <Card key={request.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  {request.nannyName} · {LEAVE_TYPES.find((t) => t.value === request.leaveType)?.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(request.startDate)} – {formatDate(request.endDate)} · {request.days} day
                  {request.days === 1 ? "" : "s"}
                </p>
                {request.notes && <p className="mt-1 text-sm text-muted-foreground">{request.notes}</p>}
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">
                {request.status}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {isFamily && request.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await reviewFn({ data: { slug, id: request.id, status: "approved" } });
                      await refresh();
                      toast.success("Leave approved");
                    }}
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await reviewFn({ data: { slug, id: request.id, status: "declined" } });
                      await refresh();
                    }}
                  >
                    <X className="h-4 w-4" /> Decline
                  </Button>
                </>
              )}
              {(isFamily || request.status === "pending") && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await removeFn({ data: { slug, id: request.id } });
                    await refresh();
                    toast.success("Leave removed");
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </HubPage>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
