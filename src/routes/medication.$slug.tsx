import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Lock, Pill, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, EmptyState, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { deleteDoseFn, getMedication, recordDoseFn } from "@/lib/medication.functions";
import { COMMON_MEDICINES } from "@/lib/medication.types";

export const Route = createFileRoute("/medication/$slug")({
  head: () => ({
    meta: [
      { title: "Medication log | The Family Wallet" },
      {
        name: "description",
        content:
          "A shared, timestamped medication log so parents and nannies always know when the last dose was given.",
      },
      { property: "og:title", content: "Medication & safety log" },
      {
        property: "og:description",
        content: "Timestamped doses, who gave them, and when the next one is safe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MedicationPage,
});

function localNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MedicationPage() {
  const { slug } = Route.useParams();
  const loadFn = useServerFn(getMedication);
  const saveFn = useServerFn(recordDoseFn);
  const removeFn = useServerFn(deleteDoseFn);

  const query = useQuery({
    queryKey: ["medication", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });
  const data = query.data;

  const [childName, setChildName] = useState("");
  const [medicine, setMedicine] = useState(COMMON_MEDICINES[0]!.name);
  const [gapHours, setGapHours] = useState(COMMON_MEDICINES[0]!.gapHours);
  const [otherMedicine, setOtherMedicine] = useState("");
  const [dose, setDose] = useState("");
  const [givenAt, setGivenAt] = useState(localNow());
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const latest = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>["doses"][number]>();
    for (const d of data?.doses ?? []) {
      const key = `${d.childName}::${d.medicine}`;
      if (!map.has(key)) map.set(key, d);
    }
    return [...map.values()].filter(
      (d) => Date.now() - new Date(d.givenAt).getTime() < 1000 * 60 * 60 * 24,
    );
  }, [data]);

  if (query.isLoading) return null;
  if (!data) return <LockedNotice slug={slug} />;

  const childOptions = data.children.map((c) => c.name);
  const chosenChild = childName || childOptions[0] || "";
  const medicineName = medicine === "Other" ? otherMedicine : medicine;

  // Doses are newest first, so the first match is this child's latest dose of this medicine.
  const lastDose = data.doses.find((d) => d.childName === chosenChild && d.medicine === medicineName);
  const lockedUntil =
    lastDose?.nextDoseFrom && new Date(lastDose.nextDoseFrom).getTime() > now
      ? new Date(lastDose.nextDoseFrom)
      : null;
  const minsLeft = lockedUntil ? Math.ceil((lockedUntil.getTime() - now) / 60000) : 0;
  const clock = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const submit = async () => {
    // Never block a real record: a dose that was genuinely given must still be loggable.
    if (
      lockedUntil &&
      !window.confirm(
        `${chosenChild} had ${medicineName} recently. Only log this if another dose really was given. Log it anyway?`,
      )
    )
      return;
    setSaving(true);
    try {
      const givenDate = new Date(givenAt);
      const next = new Date(givenDate.getTime() + gapHours * 60 * 60 * 1000);
      await saveFn({
        data: {
          slug,
          dose: {
            childName: chosenChild,
            medicine: medicineName,
            dose: dose || undefined,
            givenAt: givenDate.toISOString(),
            nextDoseFrom: next.toISOString(),
            reason: reason || undefined,
            notes: notes || undefined,
          },
        },
      });
      setDose("");
      setReason("");
      setNotes("");
      setGivenAt(localNow());
      await query.refetch();
      toast.success("Dose logged");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log the dose");
    } finally {
      setSaving(false);
    }
  };

  return (
    <HubPage
      slug={slug}
      title="Medication log"
      intro="Every dose, timestamped, with who gave it — so nobody has to text to check whether Calpol has already been given."
    >
      {latest.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="heading-display text-lg text-foreground">Last 24 hours</h2>
          {latest.map((d) => {
            const dueFrom = d.nextDoseFrom ? new Date(d.nextDoseFrom) : null;
            const safe = !dueFrom || dueFrom.getTime() <= Date.now();
            return (
              <div
                key={d.id}
                className={`rounded-2xl p-4 shadow-sm ${safe ? "bg-card" : "bg-warning-soft"}`}
              >
                <p className="font-medium text-foreground">
                  {safe ? (
                    <Check className="mr-1.5 inline h-4 w-4 text-primary" />
                  ) : (
                    <AlertTriangle className="mr-1.5 inline h-4 w-4 text-destructive" />
                  )}
                  {d.childName} — {d.medicine}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Last dose {formatWhen(d.givenAt)}
                  {d.dose ? ` · ${d.dose}` : ""} · given by {d.givenByName || d.givenBy}
                </p>
                <p
                  className={`mt-1 text-sm font-medium ${safe ? "text-primary" : "text-destructive"}`}
                >
                  {safe
                    ? "A further dose is due now if needed"
                    : `Do not give another dose before ${formatWhen(d.nextDoseFrom!)}`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <h2 className="heading-display text-lg text-foreground">Log a dose</h2>
        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Who is it for</span>
            {childOptions.length > 0 ? (
              <select
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={chosenChild}
                onChange={(e) => setChildName(e.target.value)}
              >
                {childOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={childName}
                placeholder="Child's name"
                onChange={(e) => setChildName(e.target.value)}
              />
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Medicine</span>
            <select
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={medicine}
              onChange={(e) => {
                setMedicine(e.target.value);
                const match = COMMON_MEDICINES.find((m) => m.name === e.target.value);
                if (match) setGapHours(match.gapHours);
              }}
            >
              {COMMON_MEDICINES.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          {medicine === "Other" && (
            <Field
              label="Which medicine"
              value={otherMedicine}
              placeholder="Name of the medicine"
              onChange={setOtherMedicine}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dose given" value={dose} placeholder="e.g. 5ml" onChange={setDose} />
            <Field
              label="Time given"
              type="datetime-local"
              value={givenAt}
              onChange={setGivenAt}
            />
          </div>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Leave before next dose</span>
            <select
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={String(gapHours)}
              onChange={(e) => setGapHours(Number(e.target.value))}
            >
              {[4, 6, 8, 12, 24].map((h) => (
                <option key={h} value={h}>
                  {h} hours
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Why it was given"
            value={reason}
            placeholder="Temperature, headache, hay fever"
            onChange={setReason}
          />
          <Field
            label="Anything else"
            textarea
            value={notes}
            placeholder="How they were afterwards, whether a parent was told"
            onChange={setNotes}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Always follow the instructions on the packaging and the parents' written permission.
        </p>
        {lockedUntil && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-warning-soft p-4 text-warning">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Safe-dose lockout until {clock(lockedUntil)}</p>
              <p className="mt-0.5 text-sm">
                Last {medicineName} was {formatWhen(lastDose!.givenAt)}.{" "}
                {Math.floor(minsLeft / 60)}h {minsLeft % 60}m left.
              </p>
            </div>
          </div>
        )}
        <Button
          className="mt-4"
          variant={lockedUntil ? "outline" : "default"}
          disabled={saving}
          onClick={submit}
        >
          {lockedUntil ? <Lock className="h-4 w-4" /> : <Pill className="h-4 w-4" />}
          {lockedUntil ? `Locked until ${clock(lockedUntil)}` : "Log dose"}
        </Button>
      </Card>

      <h2 className="heading-display mt-8 text-xl text-foreground">Recent doses</h2>
      <div className="mt-3 space-y-3">
        {data.doses.length === 0 && (
          <EmptyState
            icon={Pill}
            title="No doses logged yet"
            description="Each dose is timestamped here, so everyone can see what was given and when."
          />
        )}
        {data.doses.map((d) => (
          <Card key={d.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  {d.childName} — {d.medicine}
                  {d.dose ? ` · ${d.dose}` : ""}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatWhen(d.givenAt)} · given by {d.givenByName || d.givenBy}
                </p>
                {d.reason && <p className="mt-1 text-sm text-muted-foreground">{d.reason}</p>}
                {d.notes && <p className="mt-1 text-sm text-muted-foreground">{d.notes}</p>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await removeFn({ data: { slug, id: d.id } });
                  await query.refetch();
                  toast.success("Entry removed");
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </HubPage>
  );
}
