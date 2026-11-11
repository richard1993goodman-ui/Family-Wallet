import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestWalletDetails } from "@/lib/billing.functions";

/** For households that paid on the pricing page and have lost their link or code. */
export function RecoverDetails() {
  const send = useServerFn(requestWalletDetails);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!open) {
    return (
      <p className="mt-6 text-center text-[0.8125rem] text-muted-foreground">
        Lost your link or access code?{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Email them to me
        </button>
      </p>
    );
  }

  if (state === "sent") {
    return (
      <p className="mt-6 rounded-xl bg-tint-sage px-4 py-3 text-center text-sm text-foreground" role="status">
        If that address has a wallet, we have emailed the link and access code. Check your spam folder
        too.
      </p>
    );
  }

  return (
    <form
      className="mt-6 rounded-xl bg-card p-5 ring-1 ring-border"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        try {
          await send({ data: { email } });
          setState("sent");
        } catch {
          setState("error");
        }
      }}
    >
      <label htmlFor="recover-email" className="text-sm font-medium text-foreground">
        The email address you paid with
      </label>
      <Input
        id="recover-email"
        type="email"
        required
        autoComplete="email"
        className="mt-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {state === "error" && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          Something went wrong. Please try again in a moment.
        </p>
      )}
      <Button type="submit" className="mt-4 w-full" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me my details"}
      </Button>
    </form>
  );
}
