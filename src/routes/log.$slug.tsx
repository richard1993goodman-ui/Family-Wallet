import { formatDate } from "@/lib/format";
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
import { useT } from "@/lib/i18n/provider";

export const Route = createFileRoute("/log/$slug")({
  head: () => ({
    meta: [
      { title: "Daily Log — Family Wallet" },
      {
        name: "description",
        content:
          "A short end-of-shift update from your nanny: what they did, what they ate, homework and mood.",
      },
      { property: "og:title", content: "Daily Log — Family Wallet" },
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
  const t = useT();
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
      toast.success(t("log.updateAdded"));
    } catch {
      toast.error(t("log.couldnTSaveThatUpdate"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <HubPage
      slug={slug}
      title={t("log.dailyLog")}
      intro="A quick note at the end of a shift. One line is plenty — nothing here is compulsory."
    >
      {open ? (
        <Card>
          <div className="space-y-4">
            <Field
              label={t("log.date")}
              type="date"
              value={draft.logDate}
              onChange={(v) => setDraft({ ...draft, logDate: v })}
            />
            <Field
              label={t("log.whatWeDid")}
              textarea
              value={draft.activities}
              onChange={(v) => setDraft({ ...draft, activities: v })}
            />
            <Field
              label={t("log.whatWeAte")}
              textarea
              value={draft.food}
              onChange={(v) => setDraft({ ...draft, food: v })}
            />
            <Field
              label={t("log.homework")}
              value={draft.homework}
              onChange={(v) => setDraft({ ...draft, homework: v })}
            />
            <div>
              <span className="text-sm font-medium text-foreground">{t("log.mood")}</span>
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
              label={t("log.anythingNoteworthy")}
              textarea
              value={draft.notes}
              onChange={(v) => setDraft({ ...draft, notes: v })}
            />
            <Field
              label={t("log.tomorrowSRequirements")}
              textarea
              value={draft.tomorrow}
              onChange={(v) => setDraft({ ...draft, tomorrow: v })}
            />
            <div className="flex gap-3">
              <Button onClick={onSave} disabled={busy}>
                {busy ? t("log.saving") : t("log.saveUpdate")}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("tl.cancel")}</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setOpen(true)}>{t("log.addTodaySUpdate")}</Button>
      )}

      <div className="mt-6 space-y-3">
        {query.data.logs.length === 0 && (
          <EmptyState
            icon={NotebookPen}
            title={t("log.noUpdatesYet")}
            description={t("log.endOfDayNotesOn")}
          />
        )}
        {query.data.logs.map((log) => (
          <Card key={log.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="heading-display text-lg text-foreground">
                {formatDate(`${log.log_date}T00:00:00Z`, {
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
            <LogLine label={t("log.whatWeDid")} value={log.activities} />
            <LogLine label={t("log.whatWeAte")} value={log.food} />
            <LogLine label={t("log.homework")} value={log.homework} />
            <LogLine label={t("log.noteworthy")} value={log.notes} />
            <LogLine label={t("log.tomorrow")} value={log.tomorrow} />
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
