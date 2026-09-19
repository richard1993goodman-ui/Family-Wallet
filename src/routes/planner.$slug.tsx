import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import {
  addPlannerEntryFn,
  copyPreviousWeekFn,
  deletePlannerEntryFn,
  getPlanner,
} from "@/lib/family.functions";
import { HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/planner/$slug")({
  head: () => ({
    meta: [
      { title: "Weekly Planner — Athlete Mannies & Nannies" },
      {
        name: "description",
        content:
          "Your shared week with your nanny: pickups, clubs, homework and activities, day by day.",
      },
      { property: "og:title", content: "Weekly Planner — Athlete Mannies & Nannies" },
      {
        property: "og:description",
        content: "Plan the week together with your nanny, from any phone.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlannerPage,
});

function mondayOf(date: Date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - day);
  return copy.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function PlannerPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getPlanner);
  const addFn = useServerFn(addPlannerEntryFn);
  const removeFn = useServerFn(deletePlannerEntryFn);
  const copyFn = useServerFn(copyPreviousWeekFn);

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [draft, setDraft] = useState<{ date: string; time: string; title: string; child: string } | null>(
    null,
  );

  const query = useQuery({
    queryKey: ["planner", slug, weekStart],
    queryFn: () => loadFn({ data: { slug, weekStart } }),
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  const entries = query.data.entries;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["planner", slug] });
  }

  async function onAdd() {
    if (!draft) return;
    try {
      await addFn({
        data: { slug, entryDate: draft.date, timeLabel: draft.time, title: draft.title, childName: draft.child },
      });
      setDraft(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add that");
    }
  }

  return (
    <HubPage
      slug={slug}
      title="This week"
      intro="Parents and your nanny can both add and change anything here."
    >
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-sm font-medium text-foreground">
          Week of{" "}
          {new Date(`${weekStart}T00:00:00Z`).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          })}
        </span>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {days.map((day) => {
          const dayEntries = entries.filter((e) => e.entry_date === day);
          return (
            <div
              key={day}
              className={`rounded-xl border bg-card p-5 ${
                day === todayIso ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">
                  {formatDay(day)}
                  {day === todayIso && (
                    <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs">Today</span>
                  )}
                </p>
                <button
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  onClick={() => setDraft({ date: day, time: "", title: "", child: "" })}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>

              {dayEntries.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">Nothing planned yet.</p>
              )}
              <ul className="mt-2 space-y-2">
                {dayEntries.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                    <span>
                      {entry.time_label && (
                        <span className="font-medium text-foreground">{entry.time_label} </span>
                      )}
                      <span className="text-foreground">{entry.title}</span>
                      {entry.child_name && (
                        <span className="text-muted-foreground"> · {entry.child_name}</span>
                      )}
                    </span>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        await removeFn({ data: { slug, id: entry.id } });
                        await refresh();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              {draft?.date === day && (
                <div className="mt-3 space-y-2 rounded-lg bg-accent/40 p-3">
                  <div className="flex gap-2">
                    <Input
                      className="w-24"
                      placeholder="15:45"
                      value={draft.time}
                      onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                    />
                    <Input
                      placeholder="School pickup"
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Which child? (optional)"
                    value={draft.child}
                    onChange={(e) => setDraft({ ...draft, child: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={onAdd}>
                      Add to {formatDay(day).split(" ")[0]}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        className="mt-5"
        onClick={async () => {
          const result = await copyFn({ data: { slug, weekStart } });
          toast.success(
            result.copied ? `Copied ${result.copied} items from last week` : "Last week was empty",
          );
          await refresh();
        }}
      >
        Copy last week into this week
      </Button>
    </HubPage>
  );
}
