import { formatDate } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Lock, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteBankDetailsFn, getBankSummaries, revealBankDetailsFn, saveBankDetailsFn } from "@/lib/bank-details.functions";
import { bankDetailsSchema, type BankDetailsFull, type BankSummary } from "@/lib/bank-details.types";

const bankQuery = (slug: string) => queryOptions({ queryKey: ["bank-details", slug], queryFn: () => getBankSummaries({ data: { slug } }), gcTime: 0 });
export const Route = createFileRoute("/bankdetails/$slug")({
  head: () => ({ meta: [
    { title: "Nanny Bank Details — Family Wallet" },
    { name: "description", content: "A private place for your nanny to save the bank details parents use to pay them." },
    { property: "og:title", content: "Nanny Bank Details — Family Wallet" },
    { property: "og:description", content: "Nanny payment details kept hidden until you need them." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(bankQuery(params.slug)),
  component: BankPage,
});

const empty: BankDetailsFull = { accountName: "", bankName: "", sortCode: "", accountNumber: "", iban: "", swift: "", paymentReference: "" };
const FIELDS: { key: keyof BankDetailsFull; label: string; hint?: string }[] = [
  { key: "accountName", label: "Name on account" }, { key: "bankName", label: "Bank" },
  { key: "sortCode", label: "Sort code" }, { key: "accountNumber", label: "Account number" },
  { key: "iban", label: "IBAN", hint: "For international payments" }, { key: "swift", label: "SWIFT / BIC" },
  { key: "paymentReference", label: "Payment reference" },
];

function BankPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(bankQuery(slug));
  const [editing, setEditing] = useState<BankDetailsFull | null>(null);
  const client = useQueryClient();
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["bank-details", slug] }); };
  if (!data) return <LockedNotice slug={slug} />;
  return <HubPage slug={slug} title="Bank details">
    <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>{data.access === "nanny"
        ? "Save your bank details so the family can pay you. Only you and the parents in this wallet can see them, and they stay hidden until someone taps Reveal."
        : "Your nanny adds and updates their own bank details here. They stay hidden until you tap Reveal. Always double-check with your nanny in person if details ever change."}</p>
    </div>
    {data.items.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No nannies have been added to this wallet yet.</p>}
    <div className="mt-6 space-y-4">
      {data.items.map(item => <BankCard key={`${item.nannyId}:${item.updatedAt}`} slug={slug} item={item} canEdit={data.access === "nanny" && item.isMine}
        onEdit={setEditing} onChange={refresh} />)}
    </div>
    {editing && <BankEditor slug={slug} initial={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
  </HubPage>;
}

function BankCard({ slug, item, canEdit, onEdit, onChange }: { slug: string; item: BankSummary; canEdit: boolean; onEdit: (d: BankDetailsFull) => void; onChange: () => Promise<void> }) {
  const revealFn = useServerFn(revealBankDetailsFn);
  const deleteFn = useServerFn(deleteBankDetailsFn);
  const [shown, setShown] = useState<BankDetailsFull | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  useEffect(() => {
    if (!shown) return;
    const hide = () => setShown(null);
    const timer = window.setTimeout(hide, 60000);
    const vis = () => { if (document.hidden) hide(); };
    document.addEventListener("visibilitychange", vis);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", vis); };
  }, [shown]);
  async function fetchFull() { return revealFn({ data: { slug, nannyId: item.nannyId } }); }
  async function toggle() {
    if (shown) { setShown(null); return; }
    setBusy(true);
    try { setShown(await fetchFull()); } catch { toast.error("Couldn't reveal these details."); } finally { setBusy(false); }
  }
  async function edit() {
    if (!item.hasDetails) { onEdit({ ...empty }); return; }
    setBusy(true);
    try { onEdit(await fetchFull()); setShown(null); } catch { toast.error("Couldn't load your details."); } finally { setBusy(false); }
  }
  return <article className="rounded-lg border border-border bg-card p-5">
    <div className="flex flex-wrap items-start gap-2">
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-foreground">{item.nannyName}</h2>
        <p className="text-sm text-muted-foreground">{item.hasDetails ? `${item.accountName} · ${item.masked ?? ""}` : canEdit ? "You haven't added your bank details yet." : "No bank details added yet."}</p>
        {item.updatedAt && <p className="mt-1 text-xs text-muted-foreground">Updated {formatDate(item.updatedAt, { day: "numeric", month: "short", year: "numeric" })}</p>}
      </div>
      {canEdit && <>
        <Button variant={item.hasDetails ? "outline" : "default"} size="sm" disabled={busy} onClick={edit}>{item.hasDetails ? <Pencil className="size-4" /> : <Plus className="size-4" />}{item.hasDetails ? "Edit" : "Add bank details"}</Button>
        {item.hasDetails && <Button variant="ghost" size="icon" aria-label="Remove bank details" onClick={() => setRemoving(true)}><Trash2 className="size-4" /></Button>}
      </>}
    </div>
    {item.hasDetails && <div className="mt-4 border-t border-border pt-4">
      {shown ? <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {FIELDS.filter(f => shown[f.key]).map(f => <div key={f.key}>
          <dt className="text-xs text-muted-foreground">{f.label}</dt>
          <dd className="flex items-center gap-2 font-mono text-sm text-foreground break-all">{shown[f.key]}
            <button type="button" aria-label={`Copy ${f.label}`} className="text-muted-foreground hover:text-foreground" onClick={() => { void navigator.clipboard.writeText(shown[f.key]); toast.success(`${f.label} copied`); }}><Copy className="size-3.5" /></button>
          </dd>
        </div>)}
      </dl> : <p className="font-mono text-sm text-muted-foreground">Sort code •• •• •• · Account ••••••••</p>}
      <Button className="mt-4" variant="outline" size="sm" disabled={busy} onClick={toggle}>{shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{busy ? "Checking…" : shown ? "Hide" : "Reveal details"}</Button>
    </div>}
    <Dialog open={removing} onOpenChange={setRemoving}><DialogContent><DialogHeader><DialogTitle>Remove your bank details?</DialogTitle></DialogHeader>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRemoving(false)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={async () => {
        setBusy(true); try { await deleteFn({ data: { slug } }); await onChange(); setRemoving(false); } catch { toast.error("Couldn't remove these details."); } finally { setBusy(false); }
      }}>Remove</Button></div>
    </DialogContent></Dialog>
  </article>;
}

function BankEditor({ slug, initial, onClose, onSaved }: { slug: string; initial: BankDetailsFull; onClose: () => void; onSaved: () => Promise<void> }) {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const saveFn = useServerFn(saveBankDetailsFn);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = bankDetailsSchema.safeParse(d);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your details."); return; }
    setSaving(true);
    try { await saveFn({ data: { slug, details: parsed.data } }); await onSaved(); onClose(); toast.success("Bank details saved."); }
    catch { toast.error("Couldn't save. Please try again."); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={o => { if (!o && !saving) onClose(); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Your bank details</DialogTitle></DialogHeader>
    <form onSubmit={submit} className="space-y-3" autoComplete="off">
      {FIELDS.map(f => <div key={f.key} className="space-y-1.5"><Label htmlFor={`bank-${f.key}`}>{f.label}{f.hint && <span className="ml-1 text-xs font-normal text-muted-foreground">({f.hint})</span>}</Label>
        <Input id={`bank-${f.key}`} autoComplete="off" value={d[f.key]} onChange={e => setD({ ...d, [f.key]: e.target.value })} /></div>)}
      <p className="text-xs text-muted-foreground">Add an account number or IBAN. Never share your online banking password or PIN here.</p>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}><Save className="size-4" />{saving ? "Saving…" : "Save"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
