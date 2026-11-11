import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { Input } from "@/components/ui/input";
import { formatPounds } from "@/lib/agency-plans";
import {
  agencyBillingLinkFn,
  generateSeatLoginFn,
  getSeatBoardFn,
  releaseSeatFn,
  resendSeatInviteFn,
  revokeSeatInviteFn,
} from "@/lib/seat-invites.functions";

type Login = Awaited<ReturnType<typeof generateSeatLoginFn>>;

/** Seats made from a login have a placeholder address like "smith-ab12@seat.invalid"; show the family label instead. */
const seatLabel = (email: string | null) =>
  email?.endsWith("@seat.invalid") ? email.split("@")[0]!.replace(/-[a-z0-9]{4}$/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : email;

const message = (l: Login) =>
  `Hi,\n\n${l.agencyName} has set up your Family Wallet, a private place for your household's week, agreements, daily logs and more.\n\nOpen your wallet: ${l.family.url}\nAccess code: ${l.family.code}` +
  (l.nanny ? `\n\nFor ${l.nanny.name}:\nOpen: ${l.nanny.url}\nAccess code: ${l.nanny.code}` : "") +
  `\n\nYour wallet is private to your family. ${l.agencyName} cannot see what you add to it.`;

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

/** Numbered household seats. Agencies see slot, email, status and date only, never a wallet. */
export function AgencySeats() {
  const client = useQueryClient();
  const boardFn = useServerFn(getSeatBoardFn);
  const generateFn = useServerFn(generateSeatLoginFn);
  const resendFn = useServerFn(resendSeatInviteFn);
  const revokeFn = useServerFn(revokeSeatInviteFn);
  const releaseFn = useServerFn(releaseSeatFn);
  const billingFn = useServerFn(agencyBillingLinkFn);
  const board = useQuery({ queryKey: ["seat-board"], queryFn: () => boardFn() });
  const [picked, setPicked] = useState<number | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [nannyName, setNannyName] = useState("");
  const [login, setLogin] = useState<Login | null>(null);
  const [busy, setBusy] = useState(false);

  // Back from Stripe after paying: the new seats arrive once the payment is confirmed, so check a few times.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") !== "done") return;
    params.delete("billing");
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
    toast.success("Thank you. Your new seats appear as soon as the payment is confirmed.");
    let tries = 0;
    const timer = setInterval(() => {
      void client.invalidateQueries({ queryKey: ["seat-board"] });
      if (++tries >= 6) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [client]);

  const goToBilling = async (mode: "upgrade" | "manage") => {
    setBusy(true);
    try {
      const { url } = await billingFn({ data: { mode } });
      window.location.assign(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open billing");
      setBusy(false);
    }
  };

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await work();
      await client.invalidateQueries({ queryKey: ["seat-board"] });
      toast.success(done);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (board.isLoading) return <p className="mt-6 text-sm text-muted-foreground">Loading seats…</p>;
  if (!board.data) return null;
  const { seats, total, occupied, invited, plan, next } = board.data;
  const free = total - occupied - invited;

  return (
    <div className="mt-6">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">{plan} plan</p>
        <p className="heading-display mt-1 text-3xl text-primary">
          {occupied} of {total} seats in use
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{free} available · {invited} invited</p>
        {next && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button disabled={busy} variant={free <= Math.max(1, Math.round(total * 0.2)) ? "default" : "outline"} onClick={() => void goToBilling("upgrade")}>
              Upgrade to {next.name}{next.seats ? ` · ${next.seats} seats` : ""}
            </Button>
            <p className="text-sm text-muted-foreground">
              {formatPounds(next.pence ?? 0)} a month. You pay the difference now and the extra seats are released straight away.
            </p>
          </div>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void goToBilling("manage")}
          className="mt-3 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Manage billing and invoices
        </button>
      </div>

      {login && (
        <div data-tint="sage" className="tint-card mt-4 rounded-2xl p-5">
          <p className="font-medium text-foreground">{login.familyName} is ready. Copy these now: they won't be shown again.</p>
          {[{ who: login.familyName, ...login.family }, ...(login.nanny ? [{ who: login.nanny.name, ...login.nanny }] : [])].map((l) => (
            <div key={l.who} className="mt-3 rounded-xl bg-card p-3 text-sm">
              <p className="font-medium text-foreground">{l.who}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1 truncate text-muted-foreground">{l.url}</span><CopyButton text={l.url} label="Copy link" /></div>
              <div className="mt-2 flex flex-wrap items-center gap-2"><span className="flex-1 font-mono tracking-wider text-foreground">{l.code}</span><CopyButton text={l.code} label="Copy code" /></div>
            </div>
          ))}
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={message(login)} label="Copy a ready-to-send message" />
            <Button size="sm" variant="ghost" onClick={() => setLogin(null)}>Done</Button>
          </div>
        </div>
      )}

      <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-sm">
        {seats.map((seat) => (
          <div key={seat.slot} className="px-5 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-24 font-medium text-foreground">Family {seat.slot}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {seat.state === "available" ? "Available" : seatLabel(seat.email)}{seat.nannyEmail && ` · nanny: ${seat.nannyEmail}`}
                {seat.state === "invited" && ` · invited ${date(seat.invitedAt)}, expires ${date(seat.expiresAt)}`}
                {seat.state === "occupied" && ` · active since ${date(seat.invitedAt)}`}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  seat.state === "occupied" ? "bg-primary/10 text-primary" : seat.state === "invited" ? "bg-warning-soft text-warning" : "bg-accent text-muted-foreground"
                }`}
              >
                {seat.state === "occupied" ? "Active" : seat.state === "invited" ? "Invited" : "Available"}
              </span>
              {seat.state === "available" && (
                <Button size="sm" variant="outline" onClick={() => { setPicked(picked === seat.slot ? null : seat.slot); setFamilyName(""); setNannyName(""); }}>
                  Set up
                </Button>
              )}
              {seat.state === "invited" && (
                <>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => resendFn({ data: { inviteId: seat.inviteId! } }), "Invitation resent")}>Resend</Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => revokeFn({ data: { inviteId: seat.inviteId! } }), "Invitation revoked")}>Revoke</Button>
                </>
              )}
              {seat.state === "occupied" && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Release Family ${seat.slot}? Your funding of this household will end. The family keeps its account and everything in it, and the seat becomes available again.`))
                      void run(() => releaseFn({ data: { inviteId: seat.inviteId! } }), "Seat released");
                  }}
                >
                  Release seat
                </Button>
              )}
            </div>
            {picked === seat.slot && (
              <form
                className="mt-3 flex flex-wrap gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    setLogin(await generateFn({ data: { slot: seat.slot, familyName, nannyName } }));
                    setPicked(null);
                    await client.invalidateQueries({ queryKey: ["seat-board"] });
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Something went wrong");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Input required autoFocus placeholder="Family name, e.g. The Smiths" value={familyName} onChange={(e) => setFamilyName(e.target.value)} className="min-w-0 flex-1" />
                <Input placeholder="Nanny's first name (optional)" value={nannyName} onChange={(e) => setNannyName(e.target.value)} className="min-w-0 flex-1" />
                <p className="basis-full text-xs text-muted-foreground">
                  This creates the wallet and gives you its link and access code to send yourself. They are shown once, so copy them before you close the panel.
                </p>
                <Button type="submit" disabled={busy}>Generate login</Button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
