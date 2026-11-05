import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, Field, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { addPettyCashFn, deletePettyCashFn, getPettyCash } from "@/lib/petty-cash.functions";
import type { PettyCashKind } from "@/lib/petty-cash.types";

export const Route = createFileRoute("/pettycash/$slug")({
  head: () => ({
    meta: [
      { title: "Petty cash float — The Family Wallet" },
      { name: "description", content: "Track the household cash float: money added by the family and what the nanny spends." },
      { property: "og:title", content: "Petty cash float — The Family Wallet" },
      { property: "og:description", content: "A shared running balance for nanny spending money." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PettyCashPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const money = (n: number) => `£${Math.abs(n).toFixed(2)}`;

function PettyCashPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const loadFn = useServerFn(getPettyCash);
  const addFn = useServerFn(addPettyCashFn);
  const removeFn = useServerFn(deletePettyCashFn);
  const query = useQuery({ queryKey: ["petty-cash", slug], queryFn: () => loadFn({ data: { slug } }) });

  const [kind, setKind] = useState<PettyCashKind>("spend");
  const [entryDate, setEntryDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  if (query.isLoading) {
    return <PageLoading />;
  }
  if (!query.data) return <LockedNotice slug={slug} />;
  const data = query.data;
  const isFamily = data.access === "family";
  const effectiveKind: PettyCashKind = isFamily ? kind : "spend";

  const submit = async () => {
    setSaving(true);
    try {
      await addFn({ data: { slug, entry: { kind: effectiveKind, entryDate, amount: Number(amount), description } } });
      setAmount("");
      setDescription("");
      await client.invalidateQueries({ queryKey: ["petty-cash", slug] });
      toast.success(effectiveKind === "topup" ? "Money added to the float" : "Spending logged");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <HubPage slug={slug} title="Petty cash float" intro="One shared running balance for the nanny's spending money — no more scraps of receipts or guessing what's left.">
      <Card>
        <p className="text-sm text-muted-foreground">{data.balance < 0 ? "Owed to the nanny" : "Left in the float"}</p>
        <p className={`heading-display mt-1 text-4xl ${data.balance < 0 ? "text-destructive" : "text-primary"}`}>{money(data.balance)}</p>
      </Card>

      <div className="mt-6">
        <Card>
          <h2 className="font-semibold text-foreground">{isFamily ? "Add an entry" : "Log something you bought"}</h2>
          {isFamily && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant={kind === "topup" ? "default" : "outline"} onClick={() => setKind("topup")}>Add money</Button>
              <Button size="sm" variant={kind === "spend" ? "default" : "outline"} onClick={() => setKind("spend")}>Log spending</Button>
            </div>
          )}
          <div className="mt-3 grid gap-3">
            <Field label="Date" type="date" value={entryDate} onChange={setEntryDate} />
            <Field label="Amount (£)" type="number" value={amount} onChange={setAmount} placeholder="12.50" />
            <Field label="What for?" value={description} onChange={setDescription} placeholder={effectiveKind === "topup" ? "Weekly float" : "Snacks after swimming"} />
          </div>
          <Button className="mt-4" disabled={saving} onClick={submit}>{saving ? "Saving…" : "Save"}</Button>
        </Card>
      </div>

      <h2 className="ios-section-title mt-8">History</h2>
      <div className="ios-group mt-2">
        {data.entries.length === 0 && <p className="p-5 text-sm text-muted-foreground">Nothing logged yet.</p>}
        {data.entries.map((e) => (
          <div key={e.id} className="ios-row items-center">
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">{e.description}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {new Date(e.entryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {e.addedByName ?? e.addedBy}
              </span>
            </span>
            <span className={`font-semibold ${e.kind === "topup" ? "text-primary" : "text-foreground"}`}>
              {e.kind === "topup" ? "+" : "−"}{money(e.amount)}
            </span>
            {(isFamily || e.addedBy === "nanny") && (
              <button
                aria-label="Remove entry"
                className="ml-2 text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  await removeFn({ data: { slug, id: e.id } });
                  await client.invalidateQueries({ queryKey: ["petty-cash", slug] });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </HubPage>
  );
}
