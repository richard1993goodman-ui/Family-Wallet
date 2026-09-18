import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Plus } from "lucide-react";

import { claimAdmin, getAdminStatus, listFamilies, saveFamily } from "@/lib/admin.functions";
import { TIER_BANDS, tierFor } from "@/lib/tiers";
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
  head: () => ({
    meta: [
      { title: "Families — Athlete Mannies Family Wallet" },
      { name: "description", content: "Create and manage private family wallets." },
      { property: "og:title", content: "Families — Athlete Mannies Family Wallet" },
      { property: "og:description", content: "Create and manage private family wallets." },
      { name: "robots", content: "noindex" },
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [band, setBand] = useState("3");
  const [nanny, setNanny] = useState("");

  const status = useQuery({ queryKey: ["admin-status"], queryFn: () => statusFn() });
  const families = useQuery({
    queryKey: ["families"],
    queryFn: () => listFn(),
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
          tierBand: band,
          nannyName: nanny,
          startDate: "",
          termsAcceptedOn: "",
          notes: "",
          status: "active",
        },
      });
      setOpen(false);
      setName("");
      setEmail("");
      setNanny("");
      await queryClient.invalidateQueries({ queryKey: ["families"] });
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

  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Athlete Mannies &amp; Nannies
            </p>
            <h1 className="heading-display mt-2 text-3xl text-primary">Family wallets</h1>
          </div>
          <button
            onClick={signOut}
            className="mt-2 text-sm text-muted-foreground underline underline-offset-4"
          >
            Sign out
          </button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" /> Add a family
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a family</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
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
                <Label>Membership</Label>
                <Select value={band} onValueChange={setBand}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_BANDS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.days} — {t.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        <div className="mt-8 space-y-3">
          {families.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No families yet.</p>
          )}
          {families.data?.map((family) => (
            <div key={family.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link
                    to="/admin/family/$id"
                    params={{ id: family.id }}
                    className="heading-display text-lg text-foreground hover:text-primary"
                  >
                    {family.family_name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tierFor(family.tier_band).days} · {tierFor(family.tier_band).price}
                    {family.nanny_name ? ` · Nanny: ${family.nanny_name}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {family.status !== "active" && (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      Archived
                    </span>
                  )}
                  {family.dbsExpired && (
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground">
                      DBS over 3 years old
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <code className="rounded bg-muted px-2 py-1">/w/{family.slug}</code>
                <code className="rounded bg-muted px-2 py-1">Code {family.access_code}</code>
                <button
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/w/${family.slug} — access code ${family.access_code}`,
                    );
                    toast.success("Link and code copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy link &amp; code
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
