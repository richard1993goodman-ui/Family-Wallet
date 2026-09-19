import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarPlus, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import {
  addResourceToCalendarFn,
  generateActivityIdeasFn,
  generateMealIdeasFn,
  getSavedResources,
  saveResourceFn,
} from "@/lib/work-tools.functions";
import type { ActivityIdea, MealIdea, ResourceKind } from "@/lib/work-tools.model";

type Idea = ActivityIdea | MealIdea;

export function ResourceHub({ slug, kind }: { slug: string; kind: ResourceKind }) {
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getSavedResources);
  const saveFn = useServerFn(saveResourceFn);
  const calendarFn = useServerFn(addResourceToCalendarFn);
  const activityFn = useServerFn(generateActivityIdeasFn);
  const mealFn = useServerFn(generateMealIdeasFn);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [busy, setBusy] = useState(false);
  const [setting, setSetting] = useState("either");
  const [category, setCategory] = useState("after-school meal");
  const [minutes, setMinutes] = useState("30");
  const [ingredients, setIngredients] = useState("");
  const [notes, setNotes] = useState("");
  const [calendar, setCalendar] = useState<{ id: string; date: string; time: string } | null>(null);

  const query = useQuery({
    queryKey: ["saved-resources", slug, kind],
    queryFn: () => loadFn({ data: { slug, kind } }),
  });

  if (query.isLoading) return <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">Loading…</div>;
  if (!query.data) return <LockedNotice slug={slug} />;

  async function generate() {
    setBusy(true);
    try {
      if (kind === "activity") {
        const result = await activityFn({ data: { slug, setting, minutes: Number(minutes), energy: "medium", notes } });
        if (!result.ok) toast.error(result.error);
        else setIdeas(result.activities);
      } else {
        const result = await mealFn({ data: { slug, category, minutes: Number(minutes), ingredients, notes } });
        if (!result.ok) toast.error(result.error);
        else setIdeas(result.ideas);
      }
    } finally {
      setBusy(false);
    }
  }

  async function save(item: Idea) {
    await saveFn({ data: { slug, kind, item } });
    await queryClient.invalidateQueries({ queryKey: ["saved-resources", slug, kind] });
    toast.success(kind === "activity" ? "Activity saved" : "Recipe saved");
  }

  const title = kind === "activity" ? "Nanny Activity Guide" : "Nanny Fuel";
  const intro = kind === "activity"
    ? "Make safe ideas for your children, save the favourites, then put them straight into the family calendar."
    : "Create practical recipes and meal ideas around your family, then save or plan them together.";

  return (
    <HubPage slug={slug} title={title} intro={intro}>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {kind === "activity" ? (
            <label className="block">
              <span className="text-sm font-medium text-foreground">Where?</span>
              <select className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={setting} onChange={(e) => setSetting(e.target.value)}>
                <option value="either">Indoor or outdoor</option><option value="indoor">Indoor</option><option value="outdoor">Outdoor</option>
              </select>
            </label>
          ) : (
            <Field label="What shall we make?" value={category} onChange={setCategory} placeholder="After-school meal" />
          )}
          <Field label="Minutes available" type="number" value={minutes} onChange={setMinutes} />
        </div>
        {kind === "meal" && <div className="mt-4"><Field label="Ingredients already at home" value={ingredients} onChange={setIngredients} placeholder="Pasta, peas, cheese…" /></div>}
        <div className="mt-4"><Field label="Anything to consider?" textarea value={notes} onChange={setNotes} placeholder="Mood, weather, favourite things or a particular request" /></div>
        <Button className="mt-4" onClick={generate} disabled={busy}>
          <Sparkles className="h-4 w-4" /> {busy ? "Making ideas…" : "Give me ideas"}
        </Button>
      </Card>

      {ideas.length > 0 && <h2 className="heading-display mt-8 text-xl text-foreground">Ideas for your family</h2>}
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {ideas.map((item, index) => <IdeaCard key={`${item.title}-${index}`} item={item} action={<Button size="sm" onClick={() => save(item)}><Check className="h-4 w-4" /> Save</Button>} />)}
      </div>

      <h2 className="heading-display mt-8 text-xl text-foreground">Saved {kind === "activity" ? "activities" : "recipes"}</h2>
      <div className="mt-3 space-y-3">
        {query.data.resources.length === 0 && <p className="text-sm text-muted-foreground">Nothing saved yet.</p>}
        {query.data.resources.map((resource) => (
          <Card key={resource.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-medium text-foreground">{resource.title}</p>{resource.summary && <p className="mt-1 text-sm text-muted-foreground">{resource.summary}</p>}</div>
              <Button variant="outline" size="sm" onClick={() => setCalendar({ id: resource.id, date: new Date().toISOString().slice(0, 10), time: "15:30" })}><CalendarPlus className="h-4 w-4" /> Add to calendar</Button>
            </div>
            {calendar?.id === resource.id && (
              <div className="mt-4 grid gap-3 rounded-lg bg-muted p-3 sm:grid-cols-[1fr_110px_auto]">
                <Field label="Date" type="date" value={calendar.date} onChange={(date) => setCalendar({ ...calendar, date })} />
                <Field label="Time" type="time" value={calendar.time} onChange={(time) => setCalendar({ ...calendar, time })} />
                <Button className="self-end" onClick={async () => { await calendarFn({ data: { slug, resourceId: resource.id, entryDate: calendar.date, timeLabel: calendar.time } }); setCalendar(null); toast.success("Added to the calendar"); }}>Add</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </HubPage>
  );
}

function IdeaCard({ item, action }: { item: Idea; action: React.ReactNode }) {
  const list = "whatYouNeed" in item ? item.whatYouNeed : item.ingredients;
  const timing = "duration" in item ? item.duration : item.totalTime;
  return <Card><p className="heading-display text-lg text-foreground">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.hook}</p><p className="mt-2 text-xs font-medium text-primary">{timing} · {item.ageRange}</p><p className="mt-3 text-sm font-medium text-foreground">You’ll need</p><p className="mt-1 text-sm text-muted-foreground">{list.join(", ")}</p><ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">{item.steps.map((step, i) => <li key={i}>{step}</li>)}</ol><p className="mt-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Safety:</span> {item.safetyNote}</p><div className="mt-4">{action}</div></Card>;
}
