import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { requestDeletionFn } from "@/lib/lifecycle.functions";

/**
 * Where a family starts deleting its own account (an app-store requirement). It locks the wallet now, leaves 30 days
 * to download everything, then deletes it. Deleting does not cancel a subscription, and the screen says how to.
 */
export function DeleteAccount({ slug, familyName }: { slug: string; familyName?: string }) {
  const request = useServerFn(requestDeletionFn);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ deleteAfter: string | null } | null>(null);

  if (slug === "demo") return null;

  if (done) {
    return (
      <section className="mt-12 rounded-2xl bg-card p-5 shadow-sm">
        <h2 className="heading-serif text-xl text-foreground">Your account is closing</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your wallet is locked. You can download everything until{" "}
          <strong className="text-foreground">
            {done.deleteAfter
              ? formatDate(done.deleteAfter, { day: "numeric", month: "long", year: "numeric" })
              : "30 days from now"}
          </strong>
          , and we will email you reminders. After that it is deleted for good.
        </p>
        <Button asChild className="mt-4 h-12 w-full text-base">
          <Link to="/export/$slug" params={{ slug }}>
            Download my data
          </Link>
        </Button>
      </section>
    );
  }

  const confirm = async () => {
    setBusy(true);
    try {
      setDone(await request({ data: { slug, confirmName: typed } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't start that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-12 border-t border-border pt-6">
      <h2 className="heading-serif text-xl text-foreground">Delete my account</h2>
      {!open ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Close your Family Wallet and delete everything in it, including your children's details,
            documents and messages.
          </p>
          <Button
            variant="outline"
            className="mt-4 h-11 text-destructive"
            onClick={() => setOpen(true)}
          >
            Delete my account
          </Button>
        </>
      ) : (
        <div className="mt-2 space-y-4">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Your wallet locks straight away for you and everyone you have added.</li>
            <li>You then have 30 days to download all your data. We email you reminders.</li>
            <li>After 30 days everything is permanently deleted. We cannot get it back.</li>
            <li>
              This does <strong className="text-foreground">not</strong> cancel a subscription. If
              you subscribed in the app, cancel it in your phone's Settings, under your name, then
              Subscriptions.
            </li>
          </ul>
          <label className="block">
            <span className="text-sm font-medium text-foreground">
              Type {familyName ? `"${familyName}"` : "your family name"} to confirm
            </span>
            <Input
              className="mt-1.5 h-12 text-base"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="flex flex-col gap-2">
            <Button
              variant="destructive"
              className="h-12 w-full text-base"
              disabled={busy || !typed.trim()}
              onClick={() => void confirm()}
            >
              Delete my account
            </Button>
            <Button variant="ghost" className="h-11 w-full" onClick={() => setOpen(false)}>
              Keep my account
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
