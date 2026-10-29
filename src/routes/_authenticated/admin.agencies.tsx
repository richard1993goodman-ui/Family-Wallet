import { requireTwoStepClient } from "@/lib/two-step";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import { addAgencyStaff, deletePartnerAgency, listPartnerAgencies, removeAgencyStaff, savePartnerAgency } from "@/lib/agencies.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tierFor } from "@/lib/partner-tiers";

export const Route = createFileRoute("/_authenticated/admin/agencies")({
  beforeLoad: () => requireTwoStepClient(),
  head: () => ({
    meta: [
      { title: "Partner agencies — Athlete Mannies Family Wallet" },
      { name: "description", content: "Set up partner agencies and who can sign in for them." },
      { property: "og:title", content: "Partner agencies — Athlete Mannies Family Wallet" },
      { property: "og:description", content: "Set up partner agencies and who can sign in for them." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgenciesPage,
});

function AgenciesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPartnerAgencies);
  const saveFn = useServerFn(savePartnerAgency);
  const addStaffFn = useServerFn(addAgencyStaff);
  const removeStaffFn = useServerFn(removeAgencyStaff);
  const deleteFn = useServerFn(deletePartnerAgency);
  const agencies = useQuery({ queryKey: ["partner-agencies"], queryFn: () => listFn() });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [staffEmail, setStaffEmail] = useState<Record<string, string>>({});

  const refresh = () => qc.invalidateQueries({ queryKey: ["partner-agencies"] });
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Families
        </Link>
        <h1 className="heading-display mt-3 text-3xl text-primary">Partner agencies</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Each partner agency signs in at the agency login with an email you add here. They only ever see their own
          families — never yours or another agency's. Their families' wallets show their name, powered by Athlete Mannies.
        </p>

        <form
          className="mt-6 space-y-3 rounded-xl border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await saveFn({ data: { name, contactEmail: email, contactPhone: "", status: "active" } });
              setName("");
              setEmail("");
            }, "Agency added");
          }}
        >
          <p className="font-medium">Add a partner agency</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="aname">Agency name</Label>
              <Input id="aname" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="aemail">Contact email</Label>
              <Input id="aemail" type="email" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <Button type="submit"><Plus className="mr-2 h-4 w-4" /> Add agency</Button>
        </form>

        <div className="mt-6 space-y-4">
          {agencies.data?.length === 0 && <p className="text-sm text-muted-foreground">No partner agencies yet.</p>}
          {agencies.data?.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="heading-display text-lg">{a.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.contact_email ?? ""}
                  </p>
                  {(() => {
                    const t = tierFor(a.activeFamilies);
                    const pct = t.max ? Math.min(100, (a.activeFamilies / t.max) * 100) : 100;
                    return (
                      <div className="mt-2 w-64 max-w-full">
                        <p className="text-sm font-medium">
                          {t.max ? `${a.activeFamilies} / ${t.max}` : a.activeFamilies} active families — {t.name} tier
                          <span className="text-muted-foreground"> · {t.monthly ? `£${t.monthly}/month + VAT` : "Custom pricing"} · no setup fee</span>
                        </p>
                        <div className="mt-1 h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    run(
                      () => saveFn({ data: { id: a.id, name: a.name, contactEmail: a.contact_email ?? "", contactPhone: a.contact_phone ?? "", status: a.status === "active" ? "paused" : "active" } }),
                      a.status === "active" ? "Agency paused — staff can no longer sign in" : "Agency reactivated",
                    )
                  }
                >
                  {a.status === "active" ? "Pause access" : "Reactivate"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (!window.confirm(`Remove ${a.name} permanently? Their staff will lose access. This cannot be undone.`)) return;
                    void run(() => deleteFn({ data: { id: a.id } }), "Agency removed");
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Remove
                </Button>
                </div>
              </div>
              {a.status !== "active" && <p className="mt-2 text-xs font-medium text-destructive">Paused — staff cannot sign in.</p>}

              <p className="mt-4 text-sm font-medium">People who can sign in</p>
              <ul className="mt-2 space-y-1">
                {a.staff.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{s.email} <span className="text-xs text-muted-foreground">{s.joined ? "· signed in" : "· not signed in yet"}</span></span>
                    <button
                      aria-label={`Remove ${s.email}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => run(() => removeStaffFn({ data: { id: s.id } }), "Removed")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
                {a.staff.length === 0 && <li className="text-sm text-muted-foreground">Nobody yet.</li>}
              </ul>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await addStaffFn({ data: { agencyId: a.id, email: staffEmail[a.id] ?? "" } });
                    setStaffEmail((o) => ({ ...o, [a.id]: "" }));
                  }, "Added — they can now create an account with that email at the agency login");
                }}
              >
                <Input
                  type="email"
                  placeholder="name@theiragency.co.uk"
                  value={staffEmail[a.id] ?? ""}
                  onChange={(e) => setStaffEmail((o) => ({ ...o, [a.id]: e.target.value }))}
                  required
                />
                <Button type="submit" variant="outline">Add</Button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
