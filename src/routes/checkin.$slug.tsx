import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarCheck, PhoneCall, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, HubPage, LockedNotice } from "@/components/hub-ui";
import {
  deleteCheckinFn,
  getCheckins,
  requestReviewCallFn,
  saveCheckinFn,
} from "@/lib/checkin.functions";
import { CHECKIN_KINDS, CHECKIN_PROMPTS, type CheckinKind } from "@/lib/checkin.types";

export const Route = createFileRoute("/checkin/$slug")({
  head: () => ({
    meta: [
      { title: "Reviews & check-ins | Athlete Mannies Family Wallet" },
      {
        name: "description",
        content:
          "Structured 6-month and yearly check-in prompts for families and nannies, plus the option of a neutral call with Athlete Mannies.",
      },
      { property: "og:title", content: "Reviews & check-ins" },
      {
        property: "og:description",
        content: "Talk through what is working, schedule changes and pay — before small things grow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckinPage,
});

function CheckinPage() {
  const { slug } = Route.useParams();
  const loadFn = useServerFn(getCheckins);
  const saveFn = useServerFn(saveCheckinFn);
  const removeFn = useServerFn(deleteCheckinFn);
  const callFn = useServerFn(requestReviewCallFn);

  const query = useQuery({
    queryKey: ["checkin", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });
  const data = query.data;

  const [kind, setKind] = useState<CheckinKind>("six_month");
  const [nannyId, setNannyId] = useState("");
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [callNotes, setCallNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (query.isLoading) return null;
  if (!data) return <LockedNotice slug={slug} />;

  const due =
    data.monthsSinceStart === null
      ? null
      : data.monthsSinceStart >= 12
        ? "You are past a year together — a full review is due."
        : data.monthsSinceStart >= 6
          ? "You are over six months in — a halfway check-in is due."
          : `About ${Math.max(0, 6 - data.monthsSinceStart)} month${6 - data.monthsSinceStart === 1 ? "" : "s"} until your first check-in.`;

  const save = async (complete: boolean) => {
    setSaving(true);
    try {
      const result = await saveFn({
        data: {
          slug,
          checkin: {
            id: editingId,
            kind,
            nannyId: nannyId || undefined,
            answers,
            complete,
          },
        },
      });
      setEditingId(result.id);
      if (complete) {
        setEditingId(undefined);
        setAnswers({});
      }
      await query.refetch();
      toast.success(complete ? "Check-in saved to your wallet" : "Draft saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the check-in");
    } finally {
      setSaving(false);
    }
  };

  const requestCall = async () => {
    setSaving(true);
    try {
      await callFn({
        data: { slug, checkinId: editingId, kind, notes: callNotes || undefined },
      });
      setCallNotes("");
      await query.refetch();
      toast.success("Call requested — we'll be in touch to arrange a time");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <HubPage
      slug={slug}
      title="Reviews & check-ins"
      intro="A guided conversation for families and nannies — what is going well, what is changing, and pay or bonus reviews. Either of you can also ask us for a neutral call."
    >
      {due && (
        <div className="mb-6 rounded-xl border border-primary/40 bg-accent p-4">
          <p className="text-sm font-medium text-foreground">
            <CalendarCheck className="mr-1.5 inline h-4 w-4 text-primary" />
            {due}
          </p>
          {data.startDate && (
            <p className="mt-1 text-sm text-muted-foreground">
              Placement started{" "}
              {new Date(`${data.startDate}T00:00:00Z`).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
              .
            </p>
          )}
        </div>
      )}

      <Card>
        <h2 className="heading-display text-lg text-foreground">Start a check-in</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {CHECKIN_KINDS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={`rounded-xl border p-3 text-left ${
                kind === option.value ? "border-primary bg-accent" : "border-border bg-card"
              }`}
            >
              <span className="block text-sm font-medium text-foreground">{option.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{option.blurb}</span>
            </button>
          ))}
        </div>

        {data.nannies.length > 1 && (
          <label className="mt-4 block">
            <span className="text-sm font-medium text-foreground">Which nanny</span>
            <select
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={nannyId}
              onChange={(e) => setNannyId(e.target.value)}
            >
              <option value="">Everyone</option>
              {data.nannies.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-5 space-y-5">
          {CHECKIN_PROMPTS.map((prompt) => (
            <label key={prompt.key} className="block">
              <span className="text-sm font-medium text-foreground">{prompt.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{prompt.hint}</span>
              <Textarea
                className="mt-1.5"
                rows={3}
                value={answers[prompt.key] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [prompt.key]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" disabled={saving} onClick={() => save(false)}>
            <Save className="h-4 w-4" /> Save draft
          </Button>
          <Button disabled={saving} onClick={() => save(true)}>
            <CalendarCheck className="h-4 w-4" /> Save to wallet
          </Button>
        </div>
      </Card>

      <h2 className="heading-display mt-8 text-xl text-foreground">
        Ask Athlete Mannies for a call
      </h2>
      <div className="mt-3">
        <Card>
          <p className="text-sm text-muted-foreground">
            Either the family or the nanny can ask for a neutral call with us — a good way to smooth
            something out early rather than letting it build.
          </p>
          <Textarea
            className="mt-3"
            rows={3}
            value={callNotes}
            placeholder="What would you like to talk about?"
            onChange={(e) => setCallNotes(e.target.value)}
          />
          <Button className="mt-4" variant="outline" disabled={saving} onClick={requestCall}>
            <PhoneCall className="h-4 w-4" /> Request a review call
          </Button>
        </Card>
      </div>

      <h2 className="heading-display mt-8 text-xl text-foreground">Your check-ins</h2>
      <div className="mt-3 space-y-3">
        {data.checkins.length === 0 && (
          <p className="text-sm text-muted-foreground">No check-ins saved yet.</p>
        )}
        {data.checkins.map((entry) => (
          <Card key={entry.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  {CHECKIN_KINDS.find((k) => k.value === entry.kind)?.label ?? "Check-in"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  · saved by {entry.author === "nanny" ? "the nanny" : "the family"}
                  {entry.callRequested ? " · call requested" : ""}
                  {entry.status === "draft" ? " · draft" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setKind(entry.kind);
                    setAnswers(entry.answers);
                    setEditingId(entry.id);
                    setNannyId(entry.nannyId ?? "");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await removeFn({ data: { slug, id: entry.id } });
                    await query.refetch();
                    toast.success("Check-in removed");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {Object.keys(entry.answers).length > 0 && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {CHECKIN_PROMPTS.filter((p) => entry.answers[p.key]).map((p) => (
                  <div key={p.key}>
                    <p className="text-sm font-medium text-foreground">{p.label}</p>
                    <p className="text-sm text-muted-foreground">{entry.answers[p.key]}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </HubPage>
  );
}
