import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BookOpen, Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deletePremiumContent, listPremiumContentAdmin, savePerk, savePlaybook, type PerkInput, type PlaybookInput } from "@/lib/premium-content.functions";

type Family = { id: string; family_name: string };
const blankPerk: PerkInput = { title: "", partnerName: "", category: "Activities", area: "", offerText: "", description: "", redemptionInstructions: "", offerCode: "", websiteUrl: "", contactText: "", expiresOn: "", isPublished: false };
const blankPlaybook: PlaybookInput = { title: "", season: "", topic: "Activities", introduction: "", ageGuidance: "", sections: [{ heading: "", body: "" }], coverImageUrl: "", resourceUrl: "", audience: "all", familyIds: [], isFeatured: false, isPublished: false };

export function PremiumContentPanel({ families }: { families: Family[] }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listPremiumContentAdmin);
  const savePerkFn = useServerFn(savePerk);
  const savePlaybookFn = useServerFn(savePlaybook);
  const deleteFn = useServerFn(deletePremiumContent);
  const query = useQuery({ queryKey: ["admin-premium-content"], queryFn: () => listFn() });
  const [mode, setMode] = useState<"perk" | "playbook" | null>(null);
  const [perk, setPerk] = useState<PerkInput>(blankPerk);
  const [playbook, setPlaybook] = useState<PlaybookInput>(blankPlaybook);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-premium-content"] });
  const act = async (fn: () => Promise<unknown>, message: string) => { setBusy(true); try { await fn(); await refresh(); toast.success(message); setMode(null); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save"); } finally { setBusy(false); } };

  return <div className="mt-8 rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="heading-display text-lg text-foreground">Parent perks & seasonal playbooks</h2></div>
      <div className="flex gap-2">{query.data?.canPerks && <Button size="sm" variant="outline" onClick={() => { setPerk(blankPerk); setMode("perk"); }}><Gift className="h-4 w-4" /> Add perk</Button>}{query.data?.canPlaybooks && <Button size="sm" onClick={() => { setPlaybook(blankPlaybook); setMode("playbook"); }}><BookOpen className="h-4 w-4" /> Add playbook</Button>}</div>
    </div>

    {mode === "perk" && <form className="mt-5 space-y-3 border-t border-border pt-5" onSubmit={(e) => { e.preventDefault(); void act(() => savePerkFn({ data: perk }), "Partner perk saved"); }}>
      <h3 className="font-medium text-foreground">{perk.id ? "Edit partner perk" : "New partner perk"}</h3>
      <div className="grid gap-3 sm:grid-cols-2"><TextField label="Display title" value={perk.title} set={(v) => setPerk({ ...perk, title: v })} /><TextField label="Partner name" value={perk.partnerName} set={(v) => setPerk({ ...perk, partnerName: v })} /><TextField label="Category" value={perk.category} set={(v) => setPerk({ ...perk, category: v })} /><TextField label="London area / coverage" value={perk.area ?? ""} set={(v) => setPerk({ ...perk, area: v })} /><TextField label="Website URL" value={perk.websiteUrl ?? ""} set={(v) => setPerk({ ...perk, websiteUrl: v })} /><TextField label="Contact" value={perk.contactText ?? ""} set={(v) => setPerk({ ...perk, contactText: v })} /><TextField label="Private offer code" value={perk.offerCode ?? ""} set={(v) => setPerk({ ...perk, offerCode: v })} /><TextField label="Expiry date" type="date" value={perk.expiresOn ?? ""} set={(v) => setPerk({ ...perk, expiresOn: v })} /></div>
      <LongField label="Member offer" value={perk.offerText} set={(v) => setPerk({ ...perk, offerText: v })} /><LongField label="Partner description" value={perk.description ?? ""} set={(v) => setPerk({ ...perk, description: v })} /><LongField label="How parents claim it" value={perk.redemptionInstructions ?? ""} set={(v) => setPerk({ ...perk, redemptionInstructions: v })} />
      <Check label="Publish in wallets" checked={perk.isPublished} set={(v) => setPerk({ ...perk, isPublished: v })} />
      <div className="flex gap-2"><Button disabled={busy} type="submit">Save perk</Button><Button type="button" variant="outline" onClick={() => setMode(null)}>Cancel</Button></div>
    </form>}

    {mode === "playbook" && <form className="mt-5 space-y-3 border-t border-border pt-5" onSubmit={(e) => { e.preventDefault(); void act(() => savePlaybookFn({ data: playbook }), "Seasonal playbook saved"); }}>
      <h3 className="font-medium text-foreground">{playbook.id ? "Edit playbook" : "New seasonal playbook"}</h3>
      <div className="grid gap-3 sm:grid-cols-2"><TextField label="Title" value={playbook.title} set={(v) => setPlaybook({ ...playbook, title: v })} /><TextField label="Season" value={playbook.season} set={(v) => setPlaybook({ ...playbook, season: v })} /><TextField label="Topic" value={playbook.topic} set={(v) => setPlaybook({ ...playbook, topic: v })} /><TextField label="Age guidance" value={playbook.ageGuidance ?? ""} set={(v) => setPlaybook({ ...playbook, ageGuidance: v })} /><TextField label="Cover image URL (optional)" value={playbook.coverImageUrl ?? ""} set={(v) => setPlaybook({ ...playbook, coverImageUrl: v })} /><TextField label="Extra resource URL (optional)" value={playbook.resourceUrl ?? ""} set={(v) => setPlaybook({ ...playbook, resourceUrl: v })} /></div>
      <LongField label="Introduction" value={playbook.introduction ?? ""} set={(v) => setPlaybook({ ...playbook, introduction: v })} />
      <div className="space-y-3"><Label>Playbook sections</Label>{playbook.sections.map((section, index) => <div key={index} className="rounded-lg border border-border p-3"><Input aria-label={`Section ${index + 1} heading`} placeholder="Section heading" value={section.heading} onChange={(e) => setPlaybook({ ...playbook, sections: playbook.sections.map((s, i) => i === index ? { ...s, heading: e.target.value } : s) })} /><Textarea aria-label={`Section ${index + 1} body`} className="mt-2" rows={4} placeholder="Practical ideas, instructions or guidance" value={section.body} onChange={(e) => setPlaybook({ ...playbook, sections: playbook.sections.map((s, i) => i === index ? { ...s, body: e.target.value } : s) })} /></div>)}<Button type="button" size="sm" variant="outline" onClick={() => setPlaybook({ ...playbook, sections: [...playbook.sections, { heading: "", body: "" }] })}><Plus className="h-4 w-4" /> Add section</Button></div>
      <div className="flex flex-wrap gap-4"><Check label="Feature this playbook" checked={playbook.isFeatured} set={(v) => setPlaybook({ ...playbook, isFeatured: v })} /><Check label="Publish in wallets" checked={playbook.isPublished} set={(v) => setPlaybook({ ...playbook, isPublished: v })} /></div>
      <div><Label>Audience</Label><div className="mt-2 flex gap-2"><Button type="button" size="sm" variant={playbook.audience === "all" ? "default" : "outline"} onClick={() => setPlaybook({ ...playbook, audience: "all" })}>All active wallets</Button><Button type="button" size="sm" variant={playbook.audience === "selected" ? "default" : "outline"} onClick={() => setPlaybook({ ...playbook, audience: "selected" })}>Selected families</Button></div></div>
      {playbook.audience === "selected" && <div className="max-h-52 space-y-2 overflow-auto rounded-lg border border-border p-3">{families.map((family) => <Check key={family.id} label={family.family_name} checked={playbook.familyIds.includes(family.id)} set={(checked) => setPlaybook({ ...playbook, familyIds: checked ? [...playbook.familyIds, family.id] : playbook.familyIds.filter((id) => id !== family.id) })} />)}</div>}
      <div className="flex gap-2"><Button disabled={busy} type="submit">Save playbook</Button><Button type="button" variant="outline" onClick={() => setMode(null)}>Cancel</Button></div>
    </form>}

    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {query.data?.canPerks && <ContentList title="Partner perks" icon={Gift} empty="No partner perks yet." rows={(query.data?.perks ?? []).map((row) => ({ id: row.id, title: row.title, subtitle: `${row.partner_name} · ${row.is_published ? "Published" : "Draft"}`, edit: () => { setPerk({ id: row.id, title: row.title, partnerName: row.partner_name, category: row.category, area: row.area ?? "", offerText: row.offer_text, description: row.description ?? "", redemptionInstructions: row.redemption_instructions ?? "", offerCode: row.offer_code ?? "", websiteUrl: row.website_url ?? "", contactText: row.contact_text ?? "", expiresOn: row.expires_on ?? "", isPublished: row.is_published }); setMode("perk"); }, remove: () => act(() => deleteFn({ data: { kind: "perk", id: row.id } }), "Perk deleted") }))} />}
      {query.data?.canPlaybooks && <ContentList title="Seasonal playbooks" icon={BookOpen} empty="No playbooks yet." rows={(query.data?.playbooks ?? []).map((row) => ({ id: row.id, title: row.title, subtitle: `${row.season} · ${row.is_published ? "Published" : "Draft"}`, edit: () => { const raw = Array.isArray(row.sections) ? row.sections : []; const sections = raw.flatMap((value) => { if (!value || typeof value !== "object" || Array.isArray(value)) return []; const item = value as Record<string, unknown>; return typeof item["heading"] === "string" && typeof item["body"] === "string" ? [{ heading: item["heading"], body: item["body"] }] : []; }); setPlaybook({ id: row.id, title: row.title, season: row.season, topic: row.topic, introduction: row.introduction ?? "", ageGuidance: row.age_guidance ?? "", sections: sections.length ? sections : [{ heading: "", body: "" }], coverImageUrl: row.cover_image_url ?? "", resourceUrl: row.resource_url ?? "", audience: row.audience === "selected" ? "selected" : "all", familyIds: row.recipientIds, isFeatured: row.is_featured, isPublished: row.is_published }); setMode("playbook"); }, remove: () => act(() => deleteFn({ data: { kind: "playbook", id: row.id } }), "Playbook deleted") }))} />}
    </div>
  </div>;
}

function TextField({ label, value, set, type }: { label: string; value: string; set: (value: string) => void; type?: string }) { return <label className="block"><span className="text-sm font-medium text-foreground">{label}</span><Input className="mt-1" type={type} value={value} onChange={(e) => set(e.target.value)} /></label>; }
function LongField({ label, value, set }: { label: string; value: string; set: (value: string) => void }) { return <label className="block"><span className="text-sm font-medium text-foreground">{label}</span><Textarea className="mt-1" value={value} onChange={(e) => set(e.target.value)} /></label>; }
function Check({ label, checked, set }: { label: string; checked: boolean; set: (value: boolean) => void }) { return <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} />{label}</label>; }
function ContentList({ title, icon: Icon, empty, rows }: { title: string; icon: typeof Gift; empty: string; rows: { id: string; title: string; subtitle: string; edit: () => void; remove: () => void }[] }) { return <div className="rounded-lg border border-border p-4"><h3 className="flex items-center gap-2 font-medium text-foreground"><Icon className="h-4 w-4 text-primary" />{title}</h3>{rows.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{empty}</p>}<div className="mt-3 space-y-2">{rows.map((row) => <div key={row.id} className="flex items-start justify-between gap-2 border-t border-border pt-2"><div><p className="text-sm font-medium text-foreground">{row.title}</p><p className="text-xs text-muted-foreground">{row.subtitle}</p></div><div className="flex"><Button size="icon" variant="ghost" aria-label={`Edit ${row.title}`} onClick={row.edit}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Delete ${row.title}`} onClick={() => { if (confirm(`Delete ${row.title}?`)) void row.remove(); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div></div>; }