import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteHouseManualFn, getHouseManual, revealHouseManualFn, saveHouseManualFn } from "@/lib/house-manual.functions";
import { canManageManual, MANUAL_CATEGORIES, manualEntrySchema, type ManualInput, type ManualRow } from "@/lib/house-manual.types";

const manualQuery = (slug: string) => queryOptions({ queryKey: ["house-manual", slug], queryFn: () => getHouseManual({ data: { slug } }) });
export const Route = createFileRoute("/housemanual/$slug")({
  head: () => ({ meta: [
    { title: "House Manual & Codes — The Family Wallet" },
    { name: "description", content: "Your household's WiFi, access instructions, utilities, house rules and appliance notes in one private place." },
    { property: "og:title", content: "House Manual & Codes — The Family Wallet" },
    { property: "og:description", content: "Private household essentials shared between your family and nanny." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(manualQuery(params.slug)),
  component: HouseManualPage,
});

function HouseManualPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(manualQuery(slug));
  const [editing, setEditing] = useState<ManualInput | null>(null);
  const client = useQueryClient();
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["house-manual", slug] }); };
  if (!data) return <LockedNotice slug={slug} />;
  const canEdit = canManageManual(data.access);
  return <HubPage slug={slug} title="House Manual & Codes">
    <div className="flex items-center justify-between gap-3 border-b border-border pb-5">
      <p className="text-sm text-muted-foreground">Your household essentials</p>
      {canEdit && <Button onClick={() => setEditing({ category: "access", title: "", notes: "", secretValue: "" })}><Plus className="size-4" /> Add detail</Button>}
    </div>
    {MANUAL_CATEGORIES.map(category => {
      const entries = data.entries.filter(entry => entry.category === category.id);
      return <section key={category.id} className="mt-7">
        <h2 className="text-lg font-semibold text-foreground">{category.label}</h2>
        {entries.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{category.examples}. No details added yet.</p> :
          <div className="mt-3 space-y-3">{entries.map(entry => <ManualEntry key={`${entry.id}:${entry.updatedAt}`} entry={entry} slug={slug} canEdit={canEdit} onEdit={() => setEditing({ id: entry.id, category: entry.category, title: entry.title, notes: entry.notes })} onChange={refresh} />)}</div>}
      </section>;
    })}
    {editing && <ManualEditor key={editing.id ?? "new"} slug={slug} initial={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
  </HubPage>;
}

function ManualEntry({ entry, slug, canEdit, onEdit, onChange }: { entry: ManualRow; slug: string; canEdit: boolean; onEdit: () => void; onChange: () => Promise<void> }) {
  const revealFn = useServerFn(revealHouseManualFn);
  const deleteFn = useServerFn(deleteHouseManualFn);
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  useEffect(() => {
    if (value === null) return;
    const hide = () => setValue(null);
    const timer = window.setTimeout(hide, 30000);
    const visibility = () => { if (document.hidden) hide(); };
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", visibility);
    return () => { window.clearTimeout(timer); window.removeEventListener("blur", hide); document.removeEventListener("visibilitychange", visibility); };
  }, [value]);
  async function toggleValue() {
    if (value !== null) { setValue(null); return; }
    setBusy(true);
    try { const result = await revealFn({ data: { slug, id: entry.id } }); setValue(result.value); }
    catch { toast.error("Couldn't reveal this detail. Please check your wallet is unlocked."); }
    finally { setBusy(false); }
  }
  return <article className="rounded-lg border border-border bg-card p-4">
    <div className="flex items-start gap-2">
      <h3 className="min-w-0 flex-1 break-words font-semibold text-foreground">{entry.title}</h3>
      {canEdit && <>
        <Button variant="ghost" size="icon" aria-label={`Edit ${entry.title}`} title="Edit detail" onClick={() => { setValue(null); onEdit(); }}><Pencil className="size-4" /></Button>
        <Button variant="ghost" size="icon" aria-label={`Remove ${entry.title}`} title="Remove detail" onClick={() => { setValue(null); setRemoving(true); }}><Trash2 className="size-4" /></Button>
      </>}
    </div>
    {entry.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{entry.notes}</p>}
    {entry.hasSecret && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 print:hidden">
      <KeyRound className="size-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 break-all font-mono text-sm text-foreground">{value ?? "••••••••"}</span>
      <Button variant="outline" size="sm" disabled={busy} aria-label={`${value === null ? "Reveal" : "Hide"} code for ${entry.title}`} onClick={toggleValue}>
        {value === null ? <Eye className="size-4" /> : <EyeOff className="size-4" />}{busy ? "Checking…" : value === null ? "Reveal" : "Hide"}
      </Button>
    </div>}
    <Dialog open={removing} onOpenChange={setRemoving}><DialogContent><DialogHeader><DialogTitle>Remove this household detail?</DialogTitle></DialogHeader>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRemoving(false)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={async () => {
        setBusy(true); try { await deleteFn({ data: { slug, id: entry.id } }); await onChange(); setRemoving(false); } catch { toast.error("Couldn't remove this detail."); } finally { setBusy(false); }
      }}>Remove</Button></div>
    </DialogContent></Dialog>
  </article>;
}

function ManualEditor({ slug, initial, onClose, onSaved }: { slug: string; initial: ManualInput; onClose: () => void; onSaved: () => Promise<void> }) {
  const [entry, setEntry] = useState(initial);
  const [saving, setSaving] = useState(false);
  const saveFn = useServerFn(saveHouseManualFn);
  const [secretAction, setSecretAction] = useState<"keep" | "replace" | "remove">(initial.id ? "keep" : "replace");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = manualEntrySchema.safeParse({ ...entry, secretValue: secretAction === "keep" ? undefined : secretAction === "remove" ? "" : entry.secretValue ?? "" });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your details."); return; }
    setSaving(true);
    try { await saveFn({ data: { slug, entry: parsed.data } }); await onSaved(); onClose(); toast.success("Household detail saved."); }
    catch { toast.error("Couldn't save this detail. Please try again."); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{initial.id ? "Edit household detail" : "Add household detail"}</DialogTitle></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="manual-category">Category</Label><select id="manual-category" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={entry.category} onChange={e => setEntry({ ...entry, category: e.target.value as ManualInput["category"] })}>{MANUAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="manual-title">Title</Label><Input id="manual-title" required maxLength={100} placeholder="WiFi network, alarm or stopcock" value={entry.title} onChange={e => setEntry({ ...entry, title: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="manual-notes">Instructions or notes (visible to your nanny)</Label><Textarea id="manual-notes" maxLength={4000} rows={4} value={entry.notes} onChange={e => setEntry({ ...entry, notes: e.target.value })} /></div>
      {initial.id && <div className="space-y-2"><Label htmlFor="manual-code-action">Code or password</Label><select id="manual-code-action" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={secretAction} onChange={e => setSecretAction(e.target.value as typeof secretAction)}><option value="keep">Keep existing code</option><option value="replace">Add or replace code</option><option value="remove">Remove code</option></select></div>}
      {secretAction === "replace" && <div className="space-y-2"><Label htmlFor="manual-secret">Hidden code or password (optional)</Label><Input id="manual-secret" type="password" autoComplete="new-password" maxLength={500} value={entry.secretValue ?? ""} onChange={e => setEntry({ ...entry, secretValue: e.target.value })} /></div>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}><Save className="size-4" />{saving ? "Saving…" : "Save detail"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}