import { formatDate as formatLocaleDate } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Camera, Heart, Printer, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, Field, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import {
  addMomentFn,
  deleteMomentFn,
  getMoments,
  saveMomentPhotoFn,
  toggleMomentLoveFn,
} from "@/lib/moments.functions";
import { demoAvatarFor } from "@/lib/demo-photos";
import type { MomentsData, MomentRow } from "@/lib/moments.types";

export const Route = createFileRoute("/moments/$slug")({
  head: () => ({
    meta: [
      { title: "Photo moments & milestones — Family Wallet" },
      {
        name: "description",
        content: "A private photo diary and milestone journal for your children, kept in your Family Wallet.",
      },
      {
        property: "og:title",
        content: "Photo moments & milestones — Family Wallet",
      },
      {
        property: "og:description",
        content: "Photos and milestone wins from your days, shared safely between family and nanny.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MomentsPage,
});

const today = () => new Date().toISOString().slice(0, 10);

function groupByDate(moments: MomentRow[]) {
  const groups = new Map<string, MomentRow[]>();
  for (const moment of moments) {
    const list = groups.get(moment.momentDate) ?? [];
    list.push(moment);
    groups.set(moment.momentDate, list);
  }
  return [...groups.entries()];
}

function MomentsPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const loadFn = useServerFn(getMoments);
  const addFn = useServerFn(addMomentFn);
  const photoFn = useServerFn(saveMomentPhotoFn);
  const removeFn = useServerFn(deleteMomentFn);
  const loveFn = useServerFn(toggleMomentLoveFn);
  const [filter, setFilter] = useState("all");

  const query = useQuery({ queryKey: ["moments", slug], queryFn: () => loadFn({ data: { slug } }) });

  const [file, setFile] = useState<File | null>(null);
  const [momentDate, setMomentDate] = useState(today);
  const [caption, setCaption] = useState("");
  const [childId, setChildId] = useState("");
  const [milestone, setMilestone] = useState(false);
  const [milestoneLabel, setMilestoneLabel] = useState("");
  const [saving, setSaving] = useState(false);

  if (query.isLoading) {
    return (
      <PageLoading />
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  const data: MomentsData = query.data;
  const refresh = () => client.invalidateQueries({ queryKey: ["moments", slug] });
  const canDelete = (m: MomentRow) => data.access === "family" || m.addedBy === data.access;
  const shown = data.moments.filter((m) => filter === "all" || m.childName === filter);
  const kids = [...new Set([...data.children.map((c) => c.name), ...data.moments.map((m) => m.childName).filter((n): n is string => !!n)])];

  const readFile = (chosen: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("Couldn't read that photo"));
      reader.readAsDataURL(chosen);
    });

  const submit = async () => {
    if (!file && !milestone) {
      toast.error("Choose a photo, or tick 'This was a milestone' with a label.");
      return;
    }
    if (milestone && !milestoneLabel.trim()) {
      toast.error("Give the milestone a short label, e.g. 'First bike ride without stabilisers'.");
      return;
    }
    setSaving(true);
    try {
      if (file) {
        const base64 = await readFile(file);
        await photoFn({
          data: {
            slug,
            moment: {
              kind: "photo",
              momentDate,
              caption,
              childId: childId || undefined,
              milestoneLabel: milestone ? milestoneLabel : undefined,
              fileName: file.name,
              contentType: file.type,
              base64,
            },
          },
        });
      } else {
        await addFn({
          data: {
            slug,
            moment: {
              kind: "milestone",
              momentDate,
              caption,
              childId: childId || undefined,
              milestoneLabel,
            },
          },
        });
      }
      setFile(null);
      setCaption("");
      setMilestone(false);
      setMilestoneLabel("");
      await refresh();
      toast.success("Added to your moments");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  const weekFrom = weekAgo.toISOString().slice(0, 10);
  const weekMoments = data.moments.filter((m) => m.momentDate >= weekFrom);

  return (
    <HubPage
      slug={slug}
      title="Daily feed"
      intro="The day as it happens: photos, milestones and notes from the afternoon, kept just between family and nanny."
    >
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Show moments for">
        {["all", ...kids].map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium ring-1 transition-colors ${filter === k ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-foreground ring-border hover:bg-accent"}`}
          >
            {k === "all" ? "Everyone" : k}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-6">
        {shown.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here yet. Add the first photo or milestone below.</p>
        )}
        {groupByDate(shown).map(([date, dayMoments]) => (
          <section key={date} aria-label={dayLabel(date)}>
            <h2 className="text-[0.8125rem] font-semibold uppercase tracking-wide text-muted-foreground">{dayLabel(date)}</h2>
            <div className="mt-2 space-y-4">
              {dayMoments.map((m) => (
                <FeedCard key={m.id} moment={m} canDelete={canDelete(m)} onDelete={removeFn} onLove={loveFn} access={data.access} slug={slug} refresh={refresh} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <details className="mt-8 rounded-2xl bg-card shadow-sm" open={data.moments.length === 0}>
        <summary className="cursor-pointer list-none px-5 py-4 text-base font-medium text-foreground">+ Add a moment</summary>
        <div className="px-5 pb-5">
        <h2 className="sr-only">Add a moment</h2>
        <label className="mt-3 block">
          <span className="text-sm font-medium text-foreground">Photo (optional)</span>
          <input
            type="file"
            accept="image/*"
            className="mt-1.5 block w-full rounded-md border border-border bg-background p-2 text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Date" type="date" value={momentDate} onChange={setMomentDate} />
          <label className="block">
            <span className="text-sm font-medium text-foreground">Child (optional)</span>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Both / all of the children</option>
              {data.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3">
          <Field
            label={milestone ? "Milestone note" : "Caption"}
            textarea
            value={caption}
            onChange={setCaption}
            placeholder="What happened, who was there, why it mattered…"
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={milestone}
            onChange={(e) => setMilestone(e.target.checked)}
            className="h-4 w-4"
          />
          This was a milestone (add it to the journal)
        </label>
        {milestone && (
          <div className="mt-2">
            <Field
              label="Milestone label"
              value={milestoneLabel}
              onChange={setMilestoneLabel}
              placeholder="e.g. First bike ride without stabilisers"
            />
          </div>
        )}
        <Button className="mt-4" disabled={saving} onClick={submit}>
          <Camera className="h-4 w-4" /> {file ? "Save photo" : "Save milestone"}
        </Button>
        </div>
      </details>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="heading-display text-xl text-foreground">Weekly recap</h2>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything from the last seven days — a lovely thing to share with grandparents or keep.
        </p>
        <div className="mt-3">
          {weekMoments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing from this week yet.</p>
          ) : (
            <div className="space-y-2">
              {weekMoments.map((m) => (
                <MomentLine key={m.id} moment={m} />
              ))}
            </div>
          )}
        </div>
      </div>

    </HubPage>
  );
}

const dayLabel = (date: string) => {
  const t = new Date().toISOString().slice(0, 10);
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return date === t ? "Today" : date === y ? "Yesterday" : formatDate(date);
};

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
};

/** One post in the feed: who, when, the photo, what happened and a heart. */
function FeedCard({
  moment,
  canDelete,
  onDelete,
  onLove,
  access,
  slug,
  refresh,
}: {
  moment: MomentRow;
  canDelete: boolean;
  onDelete: (args: { data: { slug: string; id: string } }) => Promise<unknown>;
  onLove: (args: { data: { slug: string; id: string } }) => Promise<unknown>;
  access: "family" | "nanny";
  slug: string;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<("family" | "nanny")[]>(moment.lovedBy);
  const demo = moment.id.startsWith("demo-");
  const iLove = local.includes(access);
  const author = moment.addedByName ?? (moment.addedBy === "nanny" ? "Your nanny" : "A parent");
  const avatar = slug === "demo" ? demoAvatarFor(author) : null;

  const love = async () => {
    const next = iLove ? local.filter((r) => r !== access) : [...local, access];
    setLocal(next);
    if (demo) return; // the sample feed keeps hearts on this screen only
    try {
      await onLove({ data: { slug, id: moment.id } });
    } catch (error) {
      setLocal(local);
      toast.error(error instanceof Error ? error.message : "That could not be saved.");
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await onDelete({ data: { slug, id: moment.id } });
      await refresh();
      toast.success("Moment removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That could not be removed.");
    } finally {
      setBusy(false);
    }
  };

  const lovers = local.map((r) => (r === "nanny" ? author.split(" ")[0] : "A parent"));
  return (
    <article data-tint={moment.milestoneLabel ? "butter" : "apricot"} className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-[color-mix(in_oklab,var(--tint-fg)_14%,transparent)]">
      <header className="flex items-center gap-3 px-4 pt-4">
        {avatar ? (
          <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-semibold text-foreground" aria-hidden>
            {author.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{author}</p>
          <p className="text-xs text-muted-foreground">
            {[timeOf(moment.createdAt), moment.childName].filter(Boolean).join(" · ")}
          </p>
        </div>
        {canDelete && !demo && (
          <button type="button" onClick={remove} disabled={busy} className="text-muted-foreground hover:text-destructive print:hidden" aria-label="Remove moment">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>
      {moment.photoUrl && (
        <img src={moment.photoUrl} alt={moment.caption ?? "A family moment"} loading="lazy" className="mt-3 max-h-[28rem] w-full object-cover" />
      )}
      <div className="px-4 pb-4 pt-3">
        {moment.milestoneLabel && (
          <span className="tint-eyebrow mb-2">
            <Sparkles className="h-3 w-3" aria-hidden /> {moment.milestoneLabel}
          </span>
        )}
        {moment.caption && <p className="text-sm leading-relaxed text-foreground">{moment.caption}</p>}
        <div className="mt-3 flex items-center gap-3 print:hidden">
          <button
            type="button"
            aria-pressed={iLove}
            onClick={() => void love()}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm ring-1 transition-colors ${iLove ? "text-[#b4234a] ring-[#b4234a]/40" : "text-foreground ring-border hover:bg-accent"}`}
          >
            <Heart className={`h-4 w-4 ${iLove ? "fill-current" : ""}`} aria-hidden /> {iLove ? "Loved" : "Love"}
          </button>
          {lovers.length > 0 && <span className="text-xs text-muted-foreground">Loved by {lovers.join(" and ")}</span>}
        </div>
      </div>
    </article>
  );
}

function MomentLine({ moment }: { moment: MomentRow }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      {moment.photoUrl && (
        <img
          src={moment.photoUrl}
          alt={moment.caption ?? "A family moment"}
          className="h-14 w-14 flex-shrink-0 rounded-lg border border-border object-cover"
        />
      )}
      <div className="min-w-0">
        {moment.milestoneLabel && (
          <p className="text-sm font-medium text-foreground">{moment.milestoneLabel}</p>
        )}
        {moment.caption && <p className="mt-0.5 text-sm text-muted-foreground">{moment.caption}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDate(moment.momentDate)} · {moment.childName ?? "Family"}
        </p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return formatLocaleDate(`${value}T00:00:00Z`, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
