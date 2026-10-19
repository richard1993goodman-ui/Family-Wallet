import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LifeBuoy, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { cancelCoverFn, getCover, requestCoverFn } from "@/lib/cover.functions";
import { COVER_TYPES, type CoverType } from "@/lib/cover.types";

export const Route = createFileRoute("/cover/$slug")({
  head: () => ({
    meta: [
      { title: "Emergency cover request | Athlete Mannies Family Vault" },
      {
        name: "description",
        content:
          "Request emergency nanny cover, babysitting or holiday cover from Athlete Mannies straight from your Family Vault.",
      },
      { property: "og:title", content: "Emergency cover request" },
      {
        property: "og:description",
        content: "Ask Athlete Mannies for cover, babysitting or an extra day in a couple of taps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoverPage,
});

function CoverPage() {
  const { slug } = Route.useParams();
  const loadFn = useServerFn(getCover);
  const sendFn = useServerFn(requestCoverFn);
  const removeFn = useServerFn(cancelCoverFn);

  const query = useQuery({ queryKey: ["cover", slug], queryFn: () => loadFn({ data: { slug } }) });
  const data = query.data;

  const [coverType, setCoverType] = useState<CoverType>("emergency");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [children, setChildren] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (query.isLoading) return null;
  if (!data) return <LockedNotice slug={slug} />;

  const submit = async () => {
    setSaving(true);
    try {
      await sendFn({
        data: {
          slug,
          cover: {
            coverType,
            startDate,
            endDate: endDate || undefined,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            children: children || data.childNames.join(", ") || undefined,
            location: location || undefined,
            notes: notes || undefined,
          },
        },
      });
      setNotes("");
      await query.refetch();
      toast.success("Request sent — we'll come back to you as soon as we can");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <HubPage
      slug={slug}
      title="Request cover"
      intro="Nanny off sick, a night out, or an extra day needed? Send us the details and we will find you cover from our vetted team."
    >
      <Card>
        <h2 className="heading-display text-lg text-foreground">What do you need?</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {COVER_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setCoverType(type.value)}
              className={`rounded-xl border p-3 text-left ${
                coverType === type.value ? "border-primary bg-accent" : "border-border bg-card"
              }`}
            >
              <span className="block text-sm font-medium text-foreground">{type.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{type.blurb}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="First day needed" type="date" value={startDate} onChange={setStartDate} />
          <Field label="Last day (optional)" type="date" value={endDate} onChange={setEndDate} />
          <Field label="From" type="time" value={startTime} onChange={setStartTime} />
          <Field label="Until" type="time" value={endTime} onChange={setEndTime} />
        </div>
        <div className="mt-4 grid gap-4">
          <Field
            label="Children"
            value={children}
            placeholder={data.childNames.join(", ") || "Who needs looking after"}
            onChange={setChildren}
          />
          <Field
            label="Where"
            value={location}
            placeholder="Home, school pickup, club"
            onChange={setLocation}
          />
          <Field
            label="Anything we should know"
            textarea
            value={notes}
            placeholder="Driving needed, allergies, activities, drop-offs"
            onChange={setNotes}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Your request goes straight to Athlete Mannies and appears in your messages, so you can
          chat with us about it there.
        </p>
        <Button className="mt-4" disabled={saving} onClick={submit}>
          <Send className="h-4 w-4" /> Send request
        </Button>
      </Card>

      <h2 className="heading-display mt-8 text-xl text-foreground">Your requests</h2>
      <div className="mt-3 space-y-3">
        {data.requests.length === 0 && (
          <p className="text-sm text-muted-foreground">You have not asked for cover yet.</p>
        )}
        {data.requests.map((request) => (
          <Card key={request.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  <LifeBuoy className="mr-1.5 inline h-4 w-4 text-primary" />
                  {COVER_TYPES.find((t) => t.value === request.coverType)?.label ?? "Cover"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(request.startDate)}
                  {request.endDate && request.endDate !== request.startDate
                    ? ` – ${formatDate(request.endDate)}`
                    : ""}
                  {request.startTime ? ` · ${request.startTime}` : ""}
                  {request.endTime ? `–${request.endTime}` : ""}
                </p>
                {request.notes && (
                  <p className="mt-1 text-sm text-muted-foreground">{request.notes}</p>
                )}
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">
                {request.status === "new" ? "With the agency" : request.status}
              </span>
            </div>
            {request.status === "new" && (
              <Button
                className="mt-4"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await removeFn({ data: { slug, id: request.id } });
                  await query.refetch();
                  toast.success("Request cancelled");
                }}
              >
                <Trash2 className="h-4 w-4" /> Cancel request
              </Button>
            )}
          </Card>
        ))}
      </div>
    </HubPage>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
