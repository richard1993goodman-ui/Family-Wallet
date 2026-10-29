import { requireTwoStepClient } from "@/lib/two-step";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Plus, Trash2 } from "lucide-react";

import { addAgencyStaff, deletePartnerAgency, exportAgencyRecords, listPartnerAgencies, removeAgencyStaff, savePartnerAgency } from "@/lib/agencies.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { partnerFee } from "@/lib/partner-tiers";

export const Route = createFileRoute("/_authenticated/admin/agencies")({
  beforeLoad: () => requireTwoStepClient(),
  head: () => ({
    meta: [
      { title: "Partner agencies — Athlete Mannies Family Wallet" },
      { name: "description", content: "Set up partner agencies and who can sign in for them." },
      { property: "og:title", content: "Partner agencies — Athlete Mannies Family Wallet" },
      { property: "og:description", content: "Set up partner agencies and who can sign in for them." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const exportFn = useServerFn(exportAgencyRecords);
  const [brand, setBrand] = useState("");
  type A = { id: string; name: string; contact_email: string | null; contact_phone: string | null; status: string; brand_name: string | null; intro_pricing: boolean; short_name: string | null; allow_challenges: boolean; allow_perks: boolean; allow_playbooks: boolean };
  const saveAgency = (a: A, patch: Partial<{ status: string; brandName: string; introPricing: boolean; shortName: string; allowChallenges: boolean; allowPerks: boolean; allowPlaybooks: boolean }>) =>
    saveFn({ data: { id: a.id, name: a.name, contactEmail: a.contact_email ?? "", contactPhone: a.contact_phone ?? "", status: patch.status ?? a.status, brandName: patch.brandName ?? a.brand_name ?? "", introPricing: patch.introPricing ?? a.intro_pricing, shortName: patch.shortName ?? a.short_name ?? "", allowChallenges: patch.allowChallenges ?? a.allow_challenges, allowPerks: patch.allowPerks ?? a.allow_perks, allowPlaybooks: patch.allowPlaybooks ?? a.allow_playbooks } });
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
              await saveFn({ data: { name, contactEmail: email, contactPhone: "", status: "active", brandName: brand, introPricing: true } });
              setName("");
              setBrand("");
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
          <div>
            <Label htmlFor="abrand">Wallet name families see</Label>
            <Input id="abrand" className="mt-1" placeholder="e.g. Nurture Family Wallet" value={brand} onChange={(e) => setBrand(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Shown across their families' wallets with "Powered by AthleteMannies". New agencies start on the £35 per family introductory rate.</p>
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
                  <p className="text-sm">Families see: <strong>{a.brand_name || a.name}</strong> · Powered by AthleteMannies</p>
                  {a.short_name ? (
                    <div className="mt-2 space-y-1 text-sm">
                      {([["Their page", `/p/${a.short_name}`], ["Their demo", `/p/${a.short_name}/demo`]] as const).map(([label, path]) => (
                        <div key={label} className="flex flex-wrap items-center gap-2">
                          <span className="text-muted-foreground">{label}:</span>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{window.location.origin}{path}</code>
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { void navigator.clipboard.writeText(window.location.origin + path); toast.success("Link copied"); }}>Copy</Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Set a web address to get their branded page and demo links.</p>
                  )}
                  {(() => {
                    const t = partnerFee(a.activeFamilies, a.intro_pricing);
                    const pct = t.max ? Math.min(100, (a.activeFamilies / t.max) * 100) : 100;
                    return (
                      <div className="mt-2 w-64 max-w-full">
                        <p className="text-sm font-medium">
                          {t.max ? `${a.activeFamilies} / ${t.max}` : a.activeFamilies} active families — {t.label}{t.label === "Introductory" ? " (£35 per family)" : " tier"}
                          <span className="text-muted-foreground"> · {t.monthly !== null ? `£${t.monthly}/month + VAT` : "Bespoke pricing"} · no setup fee</span>
                        </p>
                        <div className="mt-1 h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    run(
                      () => saveAgency(a, { status: a.status === "active" ? "paused" : "active" }),
                      a.status === "active" ? "Agency paused — staff can no longer sign in" : "Agency reactivated",
                    )
                  }
                >
                  {a.status === "active" ? "Pause access" : "Reactivate"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const n = window.prompt("Wallet name families see", a.brand_name || a.name);
                    if (n !== null) void run(() => saveAgency(a, { brandName: n }), "Wallet name updated");
                  }}
                >
                  Rename wallet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const n = window.prompt("Web address for their page (letters, numbers, dashes), e.g. nurture", a.short_name ?? "");
                    if (n !== null) void run(() => saveAgency(a, { shortName: n }), "Web address saved");
                  }}
                >
                  Web address
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => run(() => saveAgency(a, { introPricing: !a.intro_pricing }), a.intro_pricing ? "Introductory rate off" : "Introductory rate on")}
                >
                  {a.intro_pricing ? "End intro rate" : "Use intro rate"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => run(async () => {
                    const json = await exportFn({ data: { id: a.id } });
                    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${(a.brand_name || a.name).replace(/[^a-z0-9]+/gi, "-")}-records.json`;
                    document.body.appendChild(link); link.click(); link.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 30000);
                  }, "Export downloaded")}
                >
                  <Download className="mr-1 h-4 w-4" /> Export
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
              <p className="mt-3 text-sm text-muted-foreground">Included controls: kids challenges, parent perks and agency materials.</p>

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
