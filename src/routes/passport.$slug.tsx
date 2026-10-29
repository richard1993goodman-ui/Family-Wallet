import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Award, Dumbbell, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addPassportEntryFn,
  deletePassportEntryFn,
  getPassport,
} from "@/lib/passport-handover.functions";
import { BADGES, SKILL_AREAS } from "@/lib/passport-handover.types";
import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/passport/$slug")({
  head: () => ({
    meta: [
      { title: "Active Kids Sports Passport — Athlete Mannies & Nannies" },
      {
        name: "description",
        content:
          "Track each child's sports skills, active challenges, confidence wins and screen-free progress inside the Family Wallet.",
      },
      { property: "og:title", content: "Active Kids Sports Passport — Athlete Mannies & Nannies" },
      {
        property: "og:description",
        content: "Sports skills, active challenges and confidence wins in your Family Wallet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PassportPage,
});

const today = () => new Date().toISOString().slice(0, 10);

const emptyDraft = {
  childName: "",
  activity: "",
  skillArea: "general",
  confidenceLevel: 3,
  effortLevel: 3,
  minutes: 30,
  badge: "",
  notes: "",
  entryDate: today(),
};

function PassportPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const loadFn = useServerFn(getPassport);
  const addFn = useServerFn(addPassportEntryFn);
  const removeFn = useServerFn(deletePassportEntryFn);

  const query = useQuery({ queryKey: ["passport", slug], queryFn: () => loadFn({ data: { slug } }) });
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  const data = query.data;
  const isFamily = data.access === "family";
  const refresh = () => client.invalidateQueries({ queryKey: ["passport", slug] });

  async function save() {
    setSaving(true);
    try {
      await addFn({ data: { slug, entry: draft } });
      setDraft({ ...emptyDraft });
      setOpen(false);
      await refresh();
      toast.success("Passport updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubPage
      slug={slug}
      title="Active Kids Sports Passport"
      intro="A running record of sports skills, outdoor challenges and confidence wins from after-school time."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Dumbbell} label="Activities" value={data.stats.entries} />
        <Stat icon={Star} label="Active minutes" value={data.stats.minutes} />
        <Stat icon={Award} label="Badges" value={data.stats.badges} />
      </div>

      <div className="mt-6">
        {open ? (
          <Card>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Date"
                  type="date"
                  value={draft.entryDate}
                  onChange={(value) => setDraft({ ...draft, entryDate: value })}
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Child</span>
                  <select
                    className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                    value={draft.childName}
                    onChange={(event) => setDraft({ ...draft, childName: event.target.value })}
                  >
                    <option value="">Choose child</option>
                    {data.children.map((child) => (
                      <option key={child} value={child}>
                        {child}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Field
                label="Activity or skill"
                value={draft.activity}
                placeholder="Football passing, swimming lengths, bike confidence…"
                onChange={(value) => setDraft({ ...draft, activity: value })}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-sm font-medium text-foreground">Skill area</span>
                  <select
                    className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                    value={draft.skillArea}
                    onChange={(event) => setDraft({ ...draft, skillArea: event.target.value })}
                  >
                    {SKILL_AREAS.map((area) => (
                      <option key={area.value} value={area.value}>
                        {area.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  label="Minutes active"
                  type="number"
                  value={String(draft.minutes)}
                  onChange={(value) => setDraft({ ...draft, minutes: Number(value) })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Rating
                  label="Confidence"
                  value={draft.confidenceLevel}
                  onChange={(value) => setDraft({ ...draft, confidenceLevel: value })}
                />
                <Rating
                  label="Effort"
                  value={draft.effortLevel}
                  onChange={(value) => setDraft({ ...draft, effortLevel: value })}
                />
              </div>

              <div>
                <span className="text-sm font-medium text-foreground">Badge</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BADGES.map((badge) => (
                    <Button
                      key={badge}
                      type="button"
                      size="sm"
                      variant={draft.badge === badge ? "default" : "outline"}
                      onClick={() => setDraft({ ...draft, badge: draft.badge === badge ? "" : badge })}
                    >
                      {badge}
                    </Button>
                  ))}
                </div>
              </div>

              <Field
                label="Notes"
                textarea
                value={draft.notes}
                placeholder="What improved, what to try next, or a proud moment."
                onChange={(value) => setDraft({ ...draft, notes: value })}
              />

              <div className="flex flex-wrap gap-3">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save passport entry"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Button onClick={() => setOpen(true)}>
            <Dumbbell className="h-4 w-4" /> Add active win
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {data.entries.length === 0 && (
          <Card>
            <p className="text-sm text-muted-foreground">
              No passport entries yet. Add the first activity after a sporty afternoon.
            </p>
          </Card>
        )}
        {data.entries.map((entry) => (
          <Card key={entry.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {formatDate(entry.entryDate)} · {entry.childName}
                </p>
                <h2 className="heading-display mt-1 text-xl text-foreground">{entry.activity}</h2>
              </div>
              {isFamily && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove passport entry"
                  onClick={async () => {
                    await removeFn({ data: { slug, id: entry.id } });
                    await refresh();
                    toast.success("Entry removed");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-1 capitalize">{entry.skillArea.replace("_", " ")}</span>
              <span className="rounded-full bg-muted px-2.5 py-1">{entry.minutes} min</span>
              <span className="rounded-full bg-muted px-2.5 py-1">Confidence {entry.confidenceLevel}/5</span>
              <span className="rounded-full bg-muted px-2.5 py-1">Effort {entry.effortLevel}/5</span>
              {entry.badge && <span className="rounded-full bg-accent px-2.5 py-1 text-foreground">{entry.badge}</span>}
            </div>
            {entry.notes && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{entry.notes}</p>}
            <p className="mt-3 text-xs text-muted-foreground">
              Added by {entry.loggedByName ?? entry.loggedBy}
            </p>
          </Card>
        ))}
      </div>
    </HubPage>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="heading-display mt-3 text-2xl text-foreground">{value}</p>
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    </div>
  );
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <Button
            key={score}
            type="button"
            size="icon"
            variant={value === score ? "default" : "outline"}
            aria-label={`${label} ${score}`}
            onClick={() => onChange(score)}
          >
            {score}
          </Button>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
