import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteKidsPlaybookFn, getKidsPlaybook, saveKidsPlaybookFn } from "@/lib/kids-playbook.functions";
import { canEditPlaybook, PLAYBOOK_CATEGORIES, playbookEntrySchema, type PlaybookInput } from "@/lib/kids-playbook.types";

const playbookQuery = (slug: string) => queryOptions({ queryKey: ["kids-playbook", slug], queryFn: () => getKidsPlaybook({ data: { slug } }) });
export const Route = createFileRoute("/kids/$slug")({
  head: () => ({ meta: [
    { title: "Kids' Playbook — The Family Wallet" },
    { name: "description", content: "Each child's comforts and quirks, how you handle big moments, friends, playdates and rainy-day ideas." },
    { property: "og:title", content: "Kids' Playbook — The Family Wallet" },
    { property: "og:description", content: "Keep parents and nanny in sync on everything that matters to the kids." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(playbookQuery(params.slug)),
  component: KidsPlaybookPage,
});

function KidsPlaybookPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(playbookQuery(slug));
  const [editing, setEditing] = useState<PlaybookInput | null>(null);
  const client = useQueryClient();
  const deleteFn = useServerFn(deleteKidsPlaybookFn);
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["kids-playbook", slug] }); };
  if (!data) return <LockedNotice slug={slug} />;
  const isParent = data.access === "family";
  return <HubPage slug={slug} title="Kids' Playbook">
    <div className="flex items-center justify-between gap-3 border-b border-border pb-5">
      <p className="text-sm text-muted-foreground">{isParent ? "So your nanny knows the kids like you do." : "Everything the family wants you to know about the kids. You can add rainy-day ideas."}</p>
      <Button onClick={() => setEditing({ category: isParent ? "comfort" : "activities", childName: "", title: "", notes: "" })}><Plus className="size-4" /> Add</Button>
    </div>
    {PLAYBOOK_CATEGORIES.map(category => {
      const entries = data.entries.filter(e => e.category === category.id);
      return <section key={category.id} className="mt-7">
        <h2 className="text-lg font-semibold text-foreground">{category.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{category.examples}</p>
        {entries.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nothing added yet.</p> :
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{entries.map(entry => {
            const canEdit = canEditPlaybook(data.access, entry.category);
            return <article key={entry.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {entry.childName && <p className="text-[0.8125rem] font-medium text-primary">{entry.childName}</p>}
                  <h3 className="break-words font-semibold text-foreground">{entry.title}</h3>
                </div>
                {canEdit && <>
                  <Button variant="ghost" size="icon" aria-label={`Edit ${entry.title}`} onClick={() => setEditing(entry)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${entry.title}`} onClick={async () => {
                    if (!window.confirm("Remove this?")) return;
                    try { await deleteFn({ data: { slug, id: entry.id } }); await refresh(); } catch { toast.error("Couldn't remove that."); }
                  }}><Trash2 className="size-4" /></Button>
                </>}
              </div>
              {entry.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{entry.notes}</p>}
              <p className="mt-2 text-xs text-muted-foreground">Added by {entry.addedBy === "nanny" ? "nanny" : "parent"}</p>
            </article>;
          })}</div>}
      </section>;
    })}
    {editing && <Editor key={editing.id ?? "new"} slug={slug} initial={editing} isParent={isParent} onClose={() => setEditing(null)} onSaved={refresh} />}
  </HubPage>;
}

function Editor({ slug, initial, isParent, onClose, onSaved }: { slug: string; initial: PlaybookInput; isParent: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [entry, setEntry] = useState<PlaybookInput>({ id: initial.id, category: initial.category, childName: initial.childName, title: initial.title, notes: initial.notes });
  const [saving, setSaving] = useState(false);
  const saveFn = useServerFn(saveKidsPlaybookFn);
  const options = PLAYBOOK_CATEGORIES.filter(c => isParent || c.id === "activities");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = playbookEntrySchema.safeParse(entry);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your details."); return; }
    setSaving(true);
    try { await saveFn({ data: { slug, entry: parsed.data } }); await onSaved(); onClose(); toast.success("Saved."); }
    catch { toast.error("Couldn't save. Please try again."); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{initial.id ? "Edit" : "Add to the playbook"}</DialogTitle></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="kp-cat">Section</Label><select id="kp-cat" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={entry.category} onChange={e => setEntry({ ...entry, category: e.target.value as PlaybookInput["category"] })}>{options.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="kp-child">Child (leave blank if it applies to everyone)</Label><Input id="kp-child" maxLength={60} value={entry.childName} onChange={e => setEntry({ ...entry, childName: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="kp-title">Title</Label><Input id="kp-title" required maxLength={100} placeholder="Calms down with, Screen rules, Leo's mum…" value={entry.title} onChange={e => setEntry({ ...entry, title: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="kp-notes">Details</Label><Textarea id="kp-notes" maxLength={4000} rows={4} value={entry.notes} onChange={e => setEntry({ ...entry, notes: e.target.value })} /></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}><Save className="size-4" />{saving ? "Saving…" : "Save"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
