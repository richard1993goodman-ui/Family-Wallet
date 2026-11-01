import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trophy, Trash2 } from "lucide-react";

import {
  createChallenge,
  deleteChallenge,
  listChallengesAdmin,
  setChallengeActive,
} from "@/lib/challenges.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Fam = { id: string; family_name: string };

export function ChallengesPanel({ families }: { families: Fam[] }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listChallengesAdmin);
  const createFn = useServerFn(createChallenge);
  const activeFn = useServerFn(setChallengeActive);
  const delFn = useServerFn(deleteChallenge);
  const list = useQuery({ queryKey: ["admin-challenges"], queryFn: () => listFn() });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-challenges"] });

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createFn({ data: { title, description, dueDate, audience, familyIds: picked } });
      toast.success(audience === "all" ? "Sent to all wallets" : `Sent to ${picked.length} wallet(s)`);
      setTitle("");
      setDescription("");
      setDueDate("");
      setPicked([]);
      setOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  const nameOf = (id: string) => families.find((f) => f.id === id)?.family_name ?? "Family";

  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="heading-display text-lg text-foreground">Kids challenges</h2>
        </div>
        <Button size="sm" variant={open ? "outline" : "default"} onClick={() => setOpen(!open)}>
          {open ? "Close" : "Set a challenge"}
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Live challenges jump to the top of each chosen wallet for the nanny to complete with the kids.
      </p>

      {open && (
        <form onSubmit={onSend} className="mt-4 space-y-3">
          <div>
            <Label htmlFor="ch-title">Challenge</Label>
            <Input id="ch-title" className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 50 keepy-uppies this week" required />
          </div>
          <div>
            <Label htmlFor="ch-desc">Details (optional)</Label>
            <Textarea id="ch-desc" className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="How to do it, safety tips, what counts" />
          </div>
          <div>
            <Label htmlFor="ch-due">Finish by (optional)</Label>
            <Input id="ch-due" type="date" className="mt-1 max-w-xs" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "selected"] as const).map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAudience(a)}
                className={`rounded-full border px-3 py-1 text-sm ${audience === a ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
              >
                {a === "all" ? `All active wallets (${families.length})` : "Choose families"}
              </button>
            ))}
          </div>
          {audience === "selected" && (
            <div className="max-h-56 space-y-1 overflow-auto rounded-md border border-border p-3">
              {families.length === 0 && <p className="text-sm text-muted-foreground">No active families.</p>}
              {families.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={picked.includes(f.id)}
                    onChange={(e) =>
                      setPicked(e.target.checked ? [...picked, f.id] : picked.filter((x) => x !== f.id))
                    }
                  />
                  {f.family_name}
                </label>
              ))}
            </div>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : audience === "all" ? "Send to all wallets" : `Send to ${picked.length} selected`}
          </Button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No challenges yet.</p>}
        {list.data?.map((c) => {
          const total = c.audience === "all" ? families.length : c.recipientIds.length;
          return (
            <div key={c.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {c.title}
                    {!c.is_active && <span className="ml-2 text-xs text-muted-foreground">(ended)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.audience === "all" ? "All wallets" : c.recipientIds.map(nameOf).join(", ")}
                    {" · "}
                    {c.completedIds.length}/{total} completed
                    {c.due_date ? ` · by ${new Date(c.due_date).toLocaleDateString("en-GB")}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await activeFn({ data: { id: c.id, active: !c.is_active } });
                      await refresh();
                    }}
                  >
                    {c.is_active ? "End" : "Restart"}
                  </Button>
                  <button
                    aria-label="Delete challenge"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      if (!window.confirm("Delete this challenge from all wallets?")) return;
                      await delFn({ data: { id: c.id } });
                      await refresh();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
