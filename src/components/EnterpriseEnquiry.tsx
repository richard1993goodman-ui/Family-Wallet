import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendEnterpriseEnquiry } from "@/lib/enquiry.functions";
import { CONTACT_EMAIL } from "@/lib/site";

/** The Enterprise enquiry form: only what we need to reply. It emails the support inbox; nothing is stored. */
export function EnterpriseEnquiry() {
  const send = useServerFn(sendEnterpriseEnquiry);
  const opened = useRef(Date.now());
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(get("email")))
      return setProblem("Enter a work email address we can reply to.");
    setProblem(null);
    setState("sending");
    try {
      const result = await send({
        data: {
          agency: get("agency"),
          name: get("name"),
          email: get("email"),
          households: get("households"),
          message: get("message") || undefined,
          website: get("website"),
          elapsed: Date.now() - opened.current,
        },
      });
      if (result.ok) return setState("sent");
      if (result.reason === "invalid") {
        setState("idle");
        return setProblem("Check each field is filled in, then send again.");
      }
      setState("failed");
    } catch {
      setState("failed");
    }
  };

  if (state === "sent") {
    return (
      <div role="status" className="rounded-2xl bg-card p-7 ring-1 ring-border sm:p-8">
        <h3 className="heading-serif text-2xl text-foreground">Thank you. We have your enquiry.</h3>
        <p className="mt-2 text-muted-foreground">We will reply from {CONTACT_EMAIL}.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-2xl bg-card p-7 ring-1 ring-border sm:grid-cols-2 sm:p-8"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="enq-agency">Agency name</Label>
        <Input
          id="enq-agency"
          name="agency"
          required
          minLength={2}
          maxLength={120}
          autoComplete="organization"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="enq-name">Your name</Label>
        <Input
          id="enq-name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="enq-email">Work email</Label>
        <Input
          id="enq-email"
          name="email"
          type="email"
          required
          maxLength={160}
          autoComplete="email"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="enq-households">Roughly how many households?</Label>
        <Input
          id="enq-households"
          name="households"
          required
          maxLength={40}
          inputMode="numeric"
          placeholder="For example 150"
        />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="enq-message">Anything we should know? (optional)</Label>
        <Textarea id="enq-message" name="message" maxLength={1000} rows={3} />
      </div>
      {/* Hidden from people and screen readers; only a bot fills it in. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit" size="lg" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send enquiry"}
        </Button>
        <p role="alert" className="text-sm text-muted-foreground">
          {problem ??
            (state === "failed" ? (
              <>
                That didn’t send. Please email{" "}
                <a
                  className="text-foreground underline underline-offset-4"
                  href={`mailto:${CONTACT_EMAIL}?subject=Enterprise%20enquiry`}
                >
                  {CONTACT_EMAIL}
                </a>{" "}
                instead.
              </>
            ) : (
              "We only use these details to reply to you."
            ))}
        </p>
      </div>
    </form>
  );
}
