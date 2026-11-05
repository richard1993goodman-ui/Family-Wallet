import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { NotebookPen, Trash2 } from "lucide-react";

import { addLogFn, deleteLogFn, getLogs } from "@/lib/family.functions";
import { MOODS } from "@/lib/family.types";
import { Card, EmptyState, Field, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/log/$slug")({
  head: () => ({
    meta: [
      { title: "Daily Log — The Family Wallet" },
      {
        name: "description",
        content:
          "A short end-of-shift update from your nanny: what they did, what they ate, homework and mood.",
      },
      { property: "og:title", content: "Daily Log — The Family Wallet" },
      {
        property: "og:description",
        content: "See how the day went, every day, in your Family Wallet.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LogPage,
});

const emptyDraft = {
  logDate: new Date().toISOString().slice(0, 10),
  activities: "",
  food: "",
  homework: "",
  mood: "",
  notes: "",
  tomorrow: "",
};

function LogPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getLogs);
  const addFn = useServerFn(addLogFn);
  const removeFn = useServerFn(deleteLogFn);

  const [draft, setDraft] = useState({ ...emptyDraft });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const query = useQuery({
    queryKey: ["logs", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });

  if (query.isLoading) {
    return (
      <PageLoading />
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  async function onSave() {
    setBusy(true);
    try {
      await addFn({ data: { slug, ...draft } });
      setDraft({ ...emptyDraft });
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["logs", slug] });
      toast.success("Update added");
    } catch {
      toast.error("Couldn't save that update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <HubPage
      slug={slug}
      title="Daily log"
      intro="A quick note at the end of a shift. One line is plenty — nothing here is compulsory."
    >
      {open ? (
        <Card>
          <div className="space-y-4">
            <Field
              label="Date"
              type="date"
              value={draft.logDate}
              onChange={(v) => setDraft({ ...draft, logDate: v })}
            />
            <Field
              label="What we did"
              textarea
              value={draft.activities}
              onChange={(v) => setDraft({ ...draft, activities: v })}
            />
            <Field
              label="What we ate"
              textarea
              value={draft.food}
              onChange={(v) => setDraft({ ...draft, food: v })}
            />
            <Field
              label="Homework"
              value={draft.homework}
              onChange={(v) => setDraft({ ...draft, homework: v })}
            />
            <div>
              <span className="text-sm font-medium text-foreground">Mood</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {MOODS.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setDraft({ ...draft, mood: draft.mood === mood ? "" : mood })}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      draft.mood === mood
                        ? "border-primary bg-accent text-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
            <Field
              label="Anything noteworthy"
              textarea
              value={draft.notes}
              onChange={(v) => setDraft({ ...draft, notes: v })}
            />
            <Field
              label="Tomorrow's requirements"
              textarea
              value={draft.tomorrow}
              onChange={(v) => setDraft({ ...draft, tomorrow: v })}
            />
            <div className="flex gap-3">
              <Button onClick={onSave} disabled={busy}>
                {busy ? "Saving…" : "Save update"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setOpen(true)}>Add today's update</Button>
      )}

      <div className="mt-6 space-y-3">
        {query.data.logs.length === 0 && (
          <EmptyState
            icon={NotebookPen}
            title="No updates yet"
            description="End-of-day notes on activities, meals, homework and mood will appear here."
          />
        )}
        {query.data.logs.map((log) => (
          <Card key={log.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="heading-display text-lg text-foreground">
                {new Date(`${log.log_date}T00:00:00Z`).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                })}
              </p>
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  await removeFn({ data: { slug, id: log.id } });
                  await queryClient.invalidateQueries({ queryKey: ["logs", slug] });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {log.mood && <p className="mt-1 text-sm text-foreground">{log.mood}</p>}
            <LogLine label="What we did" value={log.activities} />
            <LogLine label="What we ate" value={log.food} />
            <LogLine label="Homework" value={log.homework} />
            <LogLine label="Noteworthy" value={log.notes} />
            <LogLine label="Tomorrow" value={log.tomorrow} />
          </Card>
        ))}
      </div>
    </HubPage>
  );
}

function LogLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
      <span className="font-medium text-foreground">{label}: </span>
      {value}
    </p>
  );
}
