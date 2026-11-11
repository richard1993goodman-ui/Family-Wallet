import { requireTwoStepClient } from "@/lib/two-step";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Search } from "lucide-react";

import { ChallengesPanel } from "@/components/ChallengesPanel";
import { PremiumContentPanel } from "@/components/PremiumContentPanel";
import { AgencyTermsPanel } from "@/components/AgencyTermsPanel";
import { AgencySeats } from "@/components/AgencySeats";
import { claimAdmin, getAdminStatus, getAgencyOverview, listFamilies, saveFamily, sendFamilyInvite, setFamiliesAgreement } from "@/lib/admin.functions";
import { exportMyAgencyRecords } from "@/lib/agencies.functions";
import { AllowanceCard } from "@/components/AgencyAllowance";
import { roleLabel } from "@/lib/staff-roles";
import { siteUrl } from "@/lib/site";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: () => requireTwoStepClient(),
  head: () => ({
    meta: [
      { title: "Families — Family Wallet" },
      { name: "description", content: "Create and manage private Family Wallets." },
      { property: "og:title", content: "Families — Family Wallet" },
      { property: "og:description", content: "Create and manage private Family Wallets." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const statusFn = useServerFn(getAdminStatus);
  const listFn = useServerFn(listFamilies);
  const claimFn = useServerFn(claimAdmin);
  const saveFn = useServerFn(saveFamily);
  const exportFn = useServerFn(exportMyAgencyRecords);
  const inviteFn = useServerFn(sendFamilyInvite);
  const agreementFn = useServerFn(setFamiliesAgreement);
  const [selected, setSelected] = useState<string[]>([]);
  const [agreementBusy, setAgreementBusy] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [band, setBand] = useState("3");
  const [introFee, setIntroFee] = useState("");
  const [nanny, setNanny] = useState("");
  const [address, setAddress] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "quiet" | "new" | "cancelled">("all");
  const [search, setSearch] = useState("");

  const status = useQuery({ queryKey: ["admin-status"], queryFn: () => statusFn() });
  const families = useQuery({
    queryKey: ["families"],
    queryFn: () => listFn(),
    enabled: status.data?.isAdmin === true,
  });
  const overviewFn = useServerFn(getAgencyOverview);
  const overview = useQuery({
    queryKey: ["agency-overview"],
    queryFn: () => overviewFn(),
    enabled: status.data?.isAdmin === true,
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await saveFn({
        data: {
          familyName: name,
          contactEmail: email,
          contactPhone: "",
          tierBand: introFee.trim() === "" ? band : "",
          introFeePercent: introFee,
          nannyName: nanny,
          startDate: "",
          termsAcceptedOn: "",
          notes: "",
          status: "active",
          homeAddress: address,
        },
      });
      setOpen(false);
      setName("");
      setEmail("");
      setNanny("");
      setAddress("");
      setIntroFee("");
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      await queryClient.invalidateQueries({ queryKey: ["agency-overview"] });
      navigate({ to: "/admin/family/$id", params: { id: result.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the family");
    }
  }

  if (status.isLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }

  if (status.data && !status.data.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand px-5">
        <div className="max-w-sm rounded-xl border border-border bg-card p-7 text-center">
          <h1 className="heading-display text-xl text-primary">Not an agency account</h1>
          {status.data.adminExists ? (
            <p className="mt-3 text-sm text-muted-foreground">
              This account does not have access to the wallet admin.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                No agency account has been set up yet. Claim it with this account.
              </p>
              <Button
                className="mt-4 w-full"
                onClick={async () => {
                  await claimFn();
                  await queryClient.invalidateQueries({ queryKey: ["admin-status"] });
                }}
              >
                Make this my agency account
              </Button>
            </>
          )}
          <button
            onClick={signOut}
            className="mt-4 text-sm text-muted-foreground underline underline-offset-4"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const data = overview.data;
  const usage = data?.agency?.usage ?? null;
  const households = data?.households ?? [];
  const matchesFilter = (h: (typeof households)[number]) =>
    filter === "all"
      ? true
      : filter === "cancelled"
        ? h.status !== "active"
        : h.status === "active" &&
          (filter === "active" ? h.activeThisMonth : filter === "new" ? h.notOpened : !h.activeThisMonth && !h.notOpened);
  const needle = search.trim().toLowerCase();
  const shown = households.filter(
    (h) => matchesFilter(h) && (!needle || h.name.toLowerCase().includes(needle) || (h.nannyName ?? "").toLowerCase().includes(needle)),
  );
  const chips = [
    { key: "all", label: "All", count: households.length },
    { key: "active", label: "Active this month", count: data?.totals.activeThisMonth ?? 0 },
    { key: "quiet", label: "Quiet", count: data?.totals.quiet ?? 0 },
    { key: "new", label: "Not opened yet", count: data?.totals.notOpened ?? 0 },
    { key: "cancelled", label: "Cancelled", count: data?.totals.cancelled ?? 0 },
  ] as const;

  const lastSeen = (iso: string | null) => {
    if (!iso) return "Not opened yet";
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    return days <= 0 ? "Opened today" : days === 1 ? "Opened yesterday" : `Opened ${days} days ago`;
  };
  const rolesText = (roles: string[]) => {
    if (roles.length === 0) return "No staff added yet";
    const counts = new Map<string, number>();
    for (const r of roles) counts.set(r, (counts.get(r) ?? 0) + 1);
    return [...counts].map(([r, n]) => (n > 1 ? `${n} ${roleLabel(r).toLowerCase()}s` : roleLabel(r))).join(", ");
  };
  const inviteable = households.filter((h) => h.status === "active" && h.contactEmail && !h.inviteSentAt && h.notOpened);

  async function onBulkAdd() {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    setBulkBusy(true);
    let added = 0;
    try {
      for (const line of lines) {
        const [rawName, rawEmail] = line.split(/[,;\t]/).map((p) => p.trim());
        if (!rawName) continue;
        await saveFn({
          data: {
            familyName: rawName,
            contactEmail: rawEmail ?? "",
            contactPhone: "",
            tierBand: band,
            introFeePercent: "",
            nannyName: "",
            startDate: "",
            termsAcceptedOn: "",
            notes: "",
            status: "active",
          },
        });
        added += 1;
      }
      toast.success(`Added ${added} ${added === 1 ? "family" : "families"}`);
      setBulkText("");
      setBulkOpen(false);
    } catch (error) {
      toast.error(`${added > 0 ? `Added ${added}, then stopped: ` : ""}${error instanceof Error ? error.message : "Could not add the families"}`);
    } finally {
      setBulkBusy(false);
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      await queryClient.invalidateQueries({ queryKey: ["agency-overview"] });
    }
  }

  const toggleSelected = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  async function setAgreement(policy: "family" | "on" | "off") {
    setAgreementBusy(true);
    try {
      const { count } = await agreementFn({ data: { ids: selected, policy } });
      const what = policy === "on" ? "on" : policy === "off" ? "off" : "up to the family";
      toast.success(`Nanny agreement set ${what} for ${count} ${count === 1 ? "family" : "families"}`);
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ["agency-overview"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that");
    } finally {
      setAgreementBusy(false);
    }
  }

  async function sendInvite(id: string) {
    setInviting(id);
    try {
      await inviteFn({ data: { id } });
      toast.success("Invite emailed");
      await queryClient.invalidateQueries({ queryKey: ["agency-overview"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the invite");
    } finally {
      setInviting(null);
    }
  }

  async function onEmailAll() {
    if (!window.confirm(`Email ${inviteable.length} ${inviteable.length === 1 ? "family" : "families"} their wallet link and access code?`)) return;
    let sent = 0;
    for (const h of inviteable) {
      try {
        await inviteFn({ data: { id: h.id } });
        sent += 1;
      } catch (error) {
        toast.error(`${h.name}: ${error instanceof Error ? error.message : "could not send"}`);
        break;
      }
    }
    if (sent > 0) toast.success(`Emailed ${sent} ${sent === 1 ? "invite" : "invites"}`);
    await queryClient.invalidateQueries({ queryKey: ["agency-overview"] });
  }

  const copyUnopened = () => {
    const lines = households
      .filter((h) => h.notOpened)
      .map((h) => `${h.name}: ${siteUrl(`/w/${h.slug}`)}  access code ${h.accessCode}`);
    if (lines.length === 0) {
      toast.info("Every household has opened their wallet.");
      return;
    }
    void navigator.clipboard.writeText(lines.join("\n"));
    toast.success(`Copied ${lines.length} link${lines.length === 1 ? "" : "s"} and codes`);
  };

  // Partner agencies are distribution partners: seats and billing only, never family wallets.
  if (data?.scope === "partner") {
    return (
      <div className="min-h-screen bg-sand">
        <div className="mx-auto max-w-4xl px-5 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.8125rem] font-medium text-muted-foreground">{status.data?.agencyName}</p>
              <h1 className="heading-display mt-2 text-3xl text-primary">Your household seats</h1>
            </div>
            <button onClick={signOut} className="mt-2 text-sm text-muted-foreground underline underline-offset-4">Sign out</button>
          </div>
          <AgencySeats />
          <div className="mt-6 rounded-2xl bg-card p-5 shadow-sm">
            <p className="font-medium text-foreground">Families own their wallets</p>
            <p className="mt-1 text-sm text-muted-foreground">
              For privacy, agencies no longer see or manage family wallets. Your plan covers the household seats above, and each family keeps full control of its own account and information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            {status.data?.agencyLogo && (
              <img
                src={status.data.agencyLogo}
                alt={`${status.data.agencyName ?? "Agency"} logo`}
                className="mb-4 h-14 max-w-[220px] object-contain"
              />
            )}
            <p className="text-[0.8125rem] font-medium text-muted-foreground">
              {status.data?.agencyName ?? "Family Wallet"}
            </p>
            <h1 className="heading-display mt-2 text-3xl text-primary">Households</h1>
          </div>
          <button
            onClick={signOut}
            className="mt-2 text-sm text-muted-foreground underline underline-offset-4"
          >
            Sign out
          </button>
        </div>

        {usage && <AllowanceCard usage={usage} />}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add a family
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a family</DialogTitle>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div>
                  <Label htmlFor="faddress">Home address</Label>
                  <Input
                    id="faddress"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1"
                    placeholder="House number, street, postcode"
                  />
                </div>
                <div>
                  <Label htmlFor="fname">Family name</Label>
                  <Input
                    id="fname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1"
                    placeholder="The Smith family"
                  />
                </div>
                <div>
                  <Label htmlFor="femail">Contact email</Label>
                  <Input
                    id="femail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="fnanny">Nanny name</Label>
                  <Input
                    id="fnanny"
                    value={nanny}
                    onChange={(e) => setNanny(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create wallet
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Paste a list</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add several families</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                One family per line: the family name, then a comma, then their email. Each uses one seat and gets its own link and
                access code. You can email the invites afterwards.
              </p>
              <textarea
                className="min-h-40 w-full rounded-md border border-border bg-background p-3 text-sm"
                placeholder={"The Smiths, smith@example.com\nThe Joneses, jones@example.com"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <Button disabled={bulkBusy || !bulkText.trim()} onClick={() => void onBulkAdd()}>
                {bulkBusy ? "Adding…" : "Add these families"}
              </Button>
            </DialogContent>
          </Dialog>
          {inviteable.length > 0 && (
            <Button variant="outline" onClick={() => void onEmailAll()}>
              Email {inviteable.length} not yet invited
            </Button>
          )}
          {(data?.totals.notOpened ?? 0) > 0 && (
            <Button variant="outline" onClick={copyUnopened}>
              <Copy className="mr-2 h-4 w-4" /> Copy details for {data!.totals.notOpened} not opened yet
            </Button>
          )}
          <Link to="/admin/support" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Support inbox
          </Link>
          <button
            type="button"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={async () => {
              try {
                const json = await exportFn();
                const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
                const link = document.createElement("a");
                link.href = url;
                link.download = "household-records.json";
                document.body.appendChild(link); link.click(); link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 30000);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Export failed");
              }
            }}
          >
            Export my records
          </button>
          {status.data?.isOwner && (
            <Link to="/admin/agencies" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Partner agencies
            </Link>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              aria-label="Search households"
              placeholder="Search by family or staff name"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter households">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={filter === c.key}
                onClick={() => setFilter(c.key)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${filter === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
              >
                {c.label} <span className="num">{c.count}</span>
              </button>
            ))}
          </div>

          {shown.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <button
                type="button"
                className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                onClick={() =>
                  setSelected(selected.length === shown.length ? [] : shown.filter((h) => h.status === "active").map((h) => h.id))
                }
              >
                {selected.length > 0 ? "Clear selection" : "Select all shown"}
              </button>
              {selected.length > 0 && (
                <span className="flex flex-wrap items-center gap-2 rounded-lg bg-card px-3 py-2 ring-1 ring-border">
                  <span className="font-medium text-foreground">
                    {selected.length} selected · Nanny agreement:
                  </span>
                  <Button size="sm" variant="outline" disabled={agreementBusy} onClick={() => void setAgreement("on")}>On</Button>
                  <Button size="sm" variant="outline" disabled={agreementBusy} onClick={() => void setAgreement("off")}>Off</Button>
                  <Button size="sm" variant="ghost" disabled={agreementBusy} onClick={() => void setAgreement("family")}>Let the family choose</Button>
                </span>
              )}
            </div>
          )}

          {overview.isLoading && <p className="text-sm text-muted-foreground">Loading households…</p>}
          {!overview.isLoading && households.length === 0 && (
            <p className="text-sm text-muted-foreground">No families yet. Add your first one above.</p>
          )}
          {!overview.isLoading && households.length > 0 && shown.length === 0 && (
            <p className="text-sm text-muted-foreground">No households match.</p>
          )}
          {shown.map((h) => (
            <div key={h.id} className="rounded-xl bg-card p-5 ring-1 ring-border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1.5 h-4 w-4 flex-none"
                  aria-label={`Select ${h.name}`}
                  checked={selected.includes(h.id)}
                  onChange={() => toggleSelected(h.id)}
                />
                <div className="min-w-0">
                  <Link
                    to="/admin/family/$id"
                    params={{ id: h.id }}
                    className="heading-display text-lg text-foreground hover:text-primary"
                  >
                    {h.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {rolesText(h.staffRoles)}
                    {status.data?.isOwner && h.partnerAgencyId ? " · Partner agency" : ""}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{lastSeen(h.lastActiveAt)}</p>
                </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {h.status !== "active" ? (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Cancelled</span>
                  ) : h.activeThisMonth ? (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Active</span>
                  ) : h.notOpened ? (
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground">Not opened</span>
                  ) : (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Quiet</span>
                  )}
                  {h.agreementPolicy !== "family" && (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      Agreement {h.agreementPolicy === "on" ? "on" : "off"}
                    </span>
                  )}
                  {h.dbsExpired && (
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground">
                      DBS over 3 years old
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <code className="rounded bg-muted px-2 py-1">/w/{h.slug}</code>
                {h.accessCode ? (
                  <>
                    <code className="rounded bg-muted px-2 py-1">Code {h.accessCode}</code>
                    <button
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `${siteUrl(`/w/${h.slug}`)} — access code ${h.accessCode}`,
                        );
                        toast.success("Link and code copied");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy link &amp; code
                    </button>
                  </>
                ) : (
                  <span className="text-muted-foreground">Code used, no longer stored</span>
                )}
                {h.status === "active" &&
                  (h.contactEmail ? (
                    <button
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                      disabled={inviting === h.id}
                      onClick={() => void sendInvite(h.id)}
                    >
                      {inviting === h.id ? "Sending…" : h.inviteSentAt ? "Resend invite" : "Email invite"}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">No email yet</span>
                  ))}
                {h.inviteSentAt && (
                  <span className="text-muted-foreground">
                    Invite sent {new Date(h.inviteSentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <details className="mt-10 rounded-xl bg-card p-5 ring-1 ring-border">
          <summary className="cursor-pointer font-semibold text-foreground">More tools</summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Challenges, perks, seasonal playbooks and your terms and conditions. You don't need these to get families started.
          </p>
          {status.data?.features.challenges && (
            <ChallengesPanel families={(families.data ?? []).filter((f) => f.status === "active")} />
          )}
          {(status.data?.features.perks || status.data?.features.playbooks) && (
            <PremiumContentPanel families={(families.data ?? []).filter((f) => f.status === "active")} />
          )}
          <div className="mt-6"><AgencyTermsPanel /></div>
        </details>
      </div>
    </div>
  );
}
