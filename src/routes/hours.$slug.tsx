import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Card, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import type { WorkingDay } from "@/lib/agreement.model";
import { getWorkHours, saveWorkHoursFn } from "@/lib/work-hours.functions";
import { weeklyHours } from "@/lib/work-hours";

export const Route = createFileRoute("/hours/$slug")({
  head: () => ({
    meta: [
      { title: "Working hours — The Family Wallet" },
      { name: "description", content: "Set the days and hours each nanny works so the weekly schedule fits your family." },
      { property: "og:title", content: "Working hours — The Family Wallet" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HoursPage,
});

function HoursPage() {
  const { slug } = Route.useParams();
  const loadFn = useServerFn(getWorkHours);
  const query = useQuery({ queryKey: ["work-hours", slug], queryFn: () => loadFn({ data: { slug } }) });

  if (query.isLoading) return <PageLoading />;
  const data = query.data;
  if (!data) return <LockedNotice slug={slug} />;

  return (
    <HubPage
      slug={slug}
      title="Working hours"
      intro="The days and hours each person works. They fill in the weekly schedule and count leave days. For a one-off change to a single week, add it to the week plan instead."
    >
      {data.nannies.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">Add your nanny first, then set their hours here.</p>
          {data.access === "family" && (
            <Button className="mt-4" asChild>
              <Link to="/nannies/$slug" params={{ slug }}>Add your nanny</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {data.nannies.map((nanny) => (
            <NannyHours
              key={`${nanny.nannyId}-${JSON.stringify(nanny.days)}`}
              slug={slug}
              nannyId={nanny.nannyId}
              name={nanny.nannyName}
              days={nanny.days}
              fromAgreement={nanny.source === "agreement"}
              canEdit={data.access === "family"}
            />
          ))}
        </div>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        Need a one-off change?{" "}
        <Link to="/planner/$slug" params={{ slug }} className="underline underline-offset-4">
          Add it to the week plan
        </Link>
        .
      </p>
    </HubPage>
  );
}

function NannyHours({
  slug,
  nannyId,
  name,
  days: initial,
  fromAgreement,
  canEdit,
}: {
  slug: string;
  nannyId: string;
  name: string;
  days: WorkingDay[];
  fromAgreement: boolean;
  canEdit: boolean;
}) {
  const client = useQueryClient();
  const saveFn = useServerFn(saveWorkHoursFn);
  const [days, setDays] = useState(initial);
  const [saving, setSaving] = useState(false);
  const editable = canEdit && !fromAgreement;
  const total = weeklyHours(days);

  const change = (index: number, patch: Partial<WorkingDay>) =>
    setDays((current) => current.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: { slug, nannyId, days } });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["work-hours", slug] }),
        client.invalidateQueries({ queryKey: ["hub-summary", slug] }),
        client.invalidateQueries({ queryKey: ["planner", slug] }),
      ]);
      toast.success("Working hours saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save those hours");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-foreground">{name}</h2>
        <p className="text-sm text-muted-foreground">
          {total > 0 ? `${Number.isInteger(total) ? total : total.toFixed(1)} hours a week` : "No hours set yet"}
        </p>
      </div>
      {fromAgreement && (
        <p className="mt-2 text-sm text-muted-foreground">
          These come from the signed nanny agreement. To change them, update the agreement.
        </p>
      )}
      <div className="mt-4 divide-y divide-border">
        {days.map((d, i) => (
          <div key={d.day} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <label className="flex w-32 items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={d.enabled}
                disabled={!editable}
                onChange={(e) => change(i, { enabled: e.target.checked })}
              />
              {d.day}
            </label>
            {d.enabled ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="time"
                  aria-label={`${d.day} start`}
                  className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
                  value={d.startTime}
                  disabled={!editable}
                  onChange={(e) => change(i, { startTime: e.target.value })}
                />
                to
                <input
                  type="time"
                  aria-label={`${d.day} finish`}
                  className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
                  value={d.endTime}
                  disabled={!editable}
                  onChange={(e) => change(i, { endTime: e.target.value })}
                />
                {d.startTime2 !== undefined ? (
                  <>
                    <span className="px-1">then</span>
                    <input
                      type="time"
                      aria-label={`${d.day} second shift start`}
                      className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
                      value={d.startTime2}
                      disabled={!editable}
                      onChange={(e) => change(i, { startTime2: e.target.value })}
                    />
                    to
                    <input
                      type="time"
                      aria-label={`${d.day} second shift finish`}
                      className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
                      value={d.endTime2 ?? ""}
                      disabled={!editable}
                      onChange={(e) => change(i, { endTime2: e.target.value })}
                    />
                    {editable && (
                      <button
                        type="button"
                        className="text-xs underline underline-offset-4"
                        onClick={() =>
                          setDays((current) =>
                            current.map((x, j) => {
                              if (j !== i) return x;
                              const { startTime2: _s, endTime2: _e, ...rest } = x;
                              return rest;
                            }),
                          )
                        }
                      >
                        Remove split
                      </button>
                    )}
                  </>
                ) : (
                  editable && (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary underline underline-offset-4"
                      onClick={() =>
                        change(i, {
                          startTime: d.startTime > "09:00" ? "07:00" : d.startTime,
                          endTime: d.endTime > "09:00" ? "09:00" : d.endTime,
                          startTime2: "15:00",
                          endTime2: "19:00",
                        })
                      }
                    >
                      + Add split shift
                    </button>
                  )
                )}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Not working</span>
            )}
          </div>
        ))}
      </div>
      {editable && (
        <Button className="mt-4" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save hours"}
        </Button>
      )}
      {!canEdit && !fromAgreement && (
        <p className="mt-3 text-sm text-muted-foreground">Ask the family if these need to change.</p>
      )}
    </Card>
  );
}
