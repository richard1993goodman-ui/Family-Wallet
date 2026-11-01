import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trophy, CheckCircle2 } from "lucide-react";

import { completeChallenge, getWalletChallenges } from "@/lib/challenges.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function WalletChallenges({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getWalletChallenges);
  const doneFn = useServerFn(completeChallenge);
  const q = useQuery({ queryKey: ["wallet-challenges", slug], queryFn: () => getFn({ data: { slug } }) });
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const items = q.data ?? [];
  if (items.length === 0) return null;
  const open = items.filter((c) => !c.completedAt);
  const done = items.filter((c) => c.completedAt);

  return (
    <div className="mt-4 rounded-xl border-2 border-primary bg-card p-5">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Agency challenge
        </p>
      </div>
      <div className="mt-3 space-y-3">
        {open.map((c) => (
          <div key={c.id}>
            <p className="heading-display text-lg text-foreground">{c.title}</p>
            {c.description && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{c.description}</p>}
            {c.dueDate && (
              <p className="mt-1 text-xs text-muted-foreground">
                Finish by {new Date(c.dueDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              </p>
            )}
            {openId === c.id ? (
              <div className="mt-2 space-y-2">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did the kids get on? (optional)" />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await doneFn({ data: { slug, challengeId: c.id, note } });
                        setOpenId(null);
                        setNote("");
                        toast.success("Challenge complete — great work!");
                        await qc.invalidateQueries({ queryKey: ["wallet-challenges", slug] });
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not save");
                      }
                    }}
                  >
                    Save as done
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setOpenId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" className="mt-2" onClick={() => { setOpenId(c.id); setNote(""); }}>
                Mark as done
              </Button>
            )}
          </div>
        ))}
        {done.map((c) => (
          <div key={c.id} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span>
              <span className="font-medium text-foreground">{c.title}</span> — done by the {c.completedBy}
              {c.note ? `: “${c.note}”` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
