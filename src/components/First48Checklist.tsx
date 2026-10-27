import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { getFirst48, saveFirst48Fn } from "@/lib/welcome.functions";
import { FIRST_48_PHASES } from "@/lib/welcome.types";

type ChecklistData = NonNullable<Awaited<ReturnType<typeof getFirst48>>>;
type ChecklistStep = ChecklistData["nannies"][number]["steps"][number];

export function First48Checklist({ slug, data }: { slug: string; data: ChecklistData }) {
  const [selected, setSelected] = useState("");
  const nanny = data.nannies.find((person) => person.id === selected) ?? data.nannies[0];
  if (!nanny) return (
    <div className="ios-group p-5">
      <p className="font-medium text-foreground">Your first two days start here</p>
      <p className="mt-2 text-sm text-muted-foreground">Add your nanny to open their settling-in checklist.</p>
      <Button asChild className="mt-4"><Link to="/nannies/$slug" params={{ slug }}>Add your nanny <ChevronRight className="h-4 w-4" /></Link></Button>
    </div>
  );
  return (
    <div>
      {data.nannies.length > 1 && <label className="mb-5 block text-sm font-medium text-foreground">Checklist for
        <select aria-label="Checklist for" className="mt-2 block h-11 w-full rounded-md border border-input bg-background px-3" value={nanny.id} onChange={(event) => setSelected(event.target.value)}>
          {data.nannies.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
      </label>}
      <div className="border-b border-border pb-6">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-sm text-muted-foreground">Settling in with {nanny.name}</p><h2 className="mt-1 text-xl font-semibold text-foreground">{nanny.doneCount === nanny.total ? "A confident start, together" : `${nanny.doneCount} of ${nanny.total} agreed together`}</h2></div>
          {nanny.doneCount === nanny.total && <CheckCircle2 className="h-7 w-7 shrink-0 text-primary" />}
        </div>
        <Progress className="mt-4" value={100 * nanny.doneCount / nanny.total} aria-label="Agreed checklist progress" />
      </div>
      {FIRST_48_PHASES.map((phase) => <section key={phase.id} className="mt-7">
        <h2 className="ios-section-title">{phase.label}</h2>
        <div className="ios-group mt-2 divide-y divide-border">
          {nanny.steps.filter((step) => step.phase === phase.id).map((step) => <ChecklistItem key={`${nanny.id}:${step.id}`} slug={slug} nannyId={nanny.id} access={data.access} step={step} />)}
        </div>
      </section>)}
      <div className="mt-7 flex items-start gap-3 border-t border-border pt-5">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div><p className="font-medium text-foreground">Something still feels unclear?</p><Button asChild variant="link" className="h-auto p-0"><Link to="/support/$slug" params={{ slug }}>Ask Athlete Mannies <ChevronRight className="h-4 w-4" /></Link></Button></div>
      </div>
    </div>
  );
}

function ChecklistItem({ slug, nannyId, access, step }: { slug: string; nannyId: string; access: "family" | "nanny"; step: ChecklistStep }) {
  const ownConfirmed = access === "family" ? step.parentConfirmed : step.nannyConfirmed;
  const ownNote = access === "family" ? step.parentNote : step.nannyNote;
  const [note, setNote] = useState(ownNote);
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveFirst48Fn);
  const client = useQueryClient();
  async function update(confirmed: boolean) {
    setBusy(true);
    try {
      await save({ data: { slug, nannyId, stepId: step.id, confirmed, note } });
      await client.invalidateQueries({ queryKey: ["first48", slug] });
      toast.success("Checklist updated");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Your update could not be saved."); }
    finally { setBusy(false); }
  }
  const dateLabel = (date: string | null) => date ? new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }) : "Not yet";
  return <article className="p-5">
    <div className="flex items-start gap-3">
      <Checkbox id={`${nannyId}-${step.id}`} className="mt-1" aria-label={`I confirm: ${step.label}`} checked={Boolean(ownConfirmed)} disabled={busy} onCheckedChange={(checked) => update(checked === true)} />
      <div className="min-w-0 flex-1"><label htmlFor={`${nannyId}-${step.id}`} className="font-semibold text-foreground">{step.label}</label><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p></div>
      {step.done && <CheckCircle2 aria-label="Agreed together" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
    </div>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 pl-7 text-xs text-muted-foreground">
      <span>Parent · {dateLabel(step.parentConfirmed)}</span><span>Nanny · {dateLabel(step.nannyConfirmed)}</span>
    </div>
    <details className="mt-3 pl-7">
      <summary className="cursor-pointer text-sm font-medium text-primary">Notes &amp; details{step.parentNote || step.nannyNote ? " · Notes added" : ""}</summary>
      <div className="mt-3 space-y-3">
        {step.parentNote && <p className="whitespace-pre-wrap break-words text-sm text-foreground"><span className="font-semibold">Parent: </span>{step.parentNote}</p>}
        {step.nannyNote && <p className="whitespace-pre-wrap break-words text-sm text-foreground"><span className="font-semibold">Nanny: </span>{step.nannyNote}</p>}
        <label className="block text-sm text-foreground">Your {access === "family" ? "parent" : "nanny"} note<Textarea aria-label={`Your note: ${step.label}`} className="mt-2" value={note} rows={3} maxLength={2000} onChange={(event) => setNote(event.target.value)} /></label>
        <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy || note === ownNote} onClick={() => update(Boolean(ownConfirmed))}>Save note</Button><Button asChild variant="ghost" size="sm"><Link to={step.href} params={{ slug }}>Related details <ChevronRight className="h-4 w-4" /></Link></Button></div>
      </div>
    </details>
  </article>;
}