import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Pencil, Printer, Sparkles, UserPlus } from "lucide-react";

import {
  generateAgreementDraftFn,
  getAgreement,
  getNannyInvite,
  saveAgreementFn,
  signDocumentFn,
} from "@/lib/agreement.functions";
import type { AgreementData } from "@/lib/agreement.model";
import { AgreementDocument } from "@/components/AgreementDocument";
import { AgreementBuilder } from "@/components/AgreementBuilder";
import { HubPage, LockedNotice, Card } from "@/components/hub-ui";
import { SignForm, SignatureList } from "@/components/SignBlock";
import { SigningProgress } from "@/components/SigningProgress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/agreement/$slug")({
  head: () => ({
    meta: [
      { title: "Your nanny agreement — Athlete Mannies & Nannies" },
      {
        name: "description",
        content:
          "Build, read and sign your full nanny employment contract inside your family wallet — no printing, no email attachments.",
      },
      { property: "og:title", content: "Your nanny agreement — Athlete Mannies & Nannies" },
      {
        property: "og:description",
        content: "Build, read and sign your nanny employment contract inside your family wallet.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgreementPage,
});

function AgreementPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getAgreement);
  const signFn = useServerFn(signDocumentFn);
  const saveFn = useServerFn(saveAgreementFn);
  const generateFn = useServerFn(generateAgreementDraftFn);
  const inviteFn = useServerFn(getNannyInvite);

  const query = useQuery({
    queryKey: ["agreement", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });

  const [draft, setDraft] = useState<AgreementData | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ code: string } | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  const data = query.data;
  const isNanny = data?.access === "nanny";

  useEffect(() => {
    if (!data) return;
    setDraft(data.data);
    if (!data.hasContent && data.access === "family") setEditing(true);
  }, [data]);

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading your agreement…
      </div>
    );
  }

  if (!data) return <LockedNotice slug={slug} />;

  async function save(publish: boolean) {
    if (!draft) return;
    setBusy(true);
    try {
      const result = await saveFn({ data: { slug, data: draft, publish } });
      if (!result.ok) {
        toast.error("Please unlock your wallet again.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["agreement", slug] });
      toast.success(publish ? "Agreement ready to sign." : "Saved.");
      if (publish) setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!draft) return;
    setGenerating(true);
    setAiSummary(null);
    try {
      const result = await generateFn({ data: { slug, data: draft, notes } });
      if (!result.ok) {
        toast.error(
          result.reason === "locked"
            ? "Please unlock your wallet again."
            : "We couldn't write a draft just now. Please try again in a moment.",
        );
        return;
      }
      const s = result.draft;
      setDraft((current) =>
        current
          ? {
              ...current,
              jobTitle: s.jobTitle || current.jobTitle,
              overtimePolicy: s.overtimePolicy || current.overtimePolicy,
              otherDutiesClause: s.otherDutiesClause || current.otherDutiesClause,
              benefits: s.benefits || current.benefits,
              sicknessPolicy: s.sicknessPolicy || current.sicknessPolicy,
              holidayAllowance: s.holidayAllowance || current.holidayAllowance,
              probationPeriod: s.probationPeriod || current.probationPeriod,
              duties: [
                ...current.duties,
                ...s.extraDuties
                  .filter(
                    (label) =>
                      label.trim() &&
                      !current.duties.some(
                        (d) => d.label.trim().toLowerCase() === label.trim().toLowerCase(),
                      ),
                  )
                  .map((label, i) => ({
                    id: `ai-${Date.now()}-${i}`,
                    label: label.trim().slice(0, 300),
                    details: "",
                    enabled: true,
                  })),
              ],
            }
          : current,
      );
      setAiSummary(s.summary);
      toast.success("Draft written — please read it through and edit anything you'd like.");
    } finally {
      setGenerating(false);
    }
  }

  async function makeInvite(regenerate: boolean) {
    setInviteBusy(true);
    try {
      const result = await inviteFn({ data: { slug, regenerate } });
      if (!result) {
        toast.error("Please unlock your wallet again.");
        return;
      }
      setInvite({ code: result.code });
      if (regenerate) toast.success("New code created. The old one no longer works.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function onSign(name: string, role: "parent" | "nanny") {
    const result = await signFn({
      data: { slug, docKind: "agreement" as const, signerRole: role, signerName: name },
    });
    if (result.ok) {
      toast.success("Signed and saved to the wallet.");
      await queryClient.invalidateQueries({ queryKey: ["agreement", slug] });
    } else if (result.reason === "name") {
      toast.error("Please type your full name.");
    } else if (result.reason === "not_ready") {
      toast.error("Mark the agreement as ready to sign first.");
    } else {
      toast.error("Something went wrong. Please try again.");
    }
  }

  const signatures = data.signatures.filter((s) => s.docKind === "agreement");
  const issued = data.status === "issued";
  const inviteLink =
    typeof window !== "undefined" ? `${window.location.origin}/nanny/${slug}` : `/nanny/${slug}`;
  const emergency = data.emergency;
  const hasEmergencyDetails = Boolean(
    emergency.homeAddress || emergency.children.length || emergency.contacts.length,
  );

  if (editing && draft && !isNanny) {
    return (
      <HubPage
        slug={slug}
        title="Your nanny agreement"
        intro="Fill this in together with your nanny. You can save and come back at any time."
      >
        <div className="space-y-5">
          <Card>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div className="flex-1">
                <h2 className="heading-display text-lg text-foreground">
                  Write my first draft for me
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tell us about your family and your nanny in your own words — the school run, the
                  hours, pay, anything that matters. We'll use that, plus your emergency card, to
                  write a personalised draft you can edit.
                </p>
                {hasEmergencyDetails && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Using your emergency card: {emergency.homeAddress ? "home address, " : ""}
                    {emergency.children.length
                      ? `${emergency.children.length} child${emergency.children.length === 1 ? "" : "ren"}, `
                      : ""}
                    allergies, medication and emergency contacts.
                  </p>
                )}
                <Textarea
                  className="mt-3"
                  rows={4}
                  value={notes}
                  placeholder="e.g. Two children, school pick-up at 3.15pm, tea and homework, bath and bedtime. £16 an hour, paid monthly. Mileage for club runs."
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button className="mt-3" disabled={generating} onClick={generate}>
                  {generating ? "Writing your draft…" : "Generate my draft"}
                </Button>
                {aiSummary && (
                  <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {aiSummary}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Always read the draft through. Nothing is sent to your nanny until you mark it
                  ready to sign.
                </p>
              </div>
            </div>
          </Card>

          <AgreementBuilder data={draft} onChange={setDraft} />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" disabled={busy} onClick={() => save(false)}>
              Save and finish later
            </Button>
            <Button disabled={busy} onClick={() => save(true)}>
              {issued ? "Save and re-issue for signing" : "Done — ready to sign"}
            </Button>
            {data.hasContent && (
              <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
          {issued && (
            <p className="text-xs text-muted-foreground">
              Re-issuing creates a new version, so parent and nanny will need to sign again.
            </p>
          )}
        </div>
      </HubPage>
    );
  }

  const body = (
    <div className="space-y-6">
      {!isNanny && (
        <div className="flex flex-wrap gap-3 print:hidden">
          <Button onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit agreement
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print or save as PDF
          </Button>
        </div>
      )}

      <div className="print:hidden">
        <SigningProgress status={data.status} version={data.version} signatures={signatures} />
      </div>

      {!issued && !isNanny && (
        <Card>
          <p className="text-sm text-muted-foreground">
            This is still a draft. When you and your nanny are happy with it, open the editor and
            choose <span className="font-medium text-foreground">Done — ready to sign</span>.
          </p>
        </Card>
      )}

      {!isNanny && (
        <Card>
          <div className="flex items-start gap-3">
            <UserPlus className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <div className="flex-1">
              <h2 className="heading-display text-lg text-foreground">Invite your nanny to sign</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Send your nanny their own link and code. It opens the agreement only — the rest of
                your wallet stays private.
              </p>
              {invite ? (
                <div className="mt-3 space-y-2">
                  <p className="break-all rounded-lg bg-muted px-3 py-2 text-sm">{inviteLink}</p>
                  <p className="rounded-lg bg-muted px-3 py-2 font-mono text-lg tracking-[0.3em]">
                    {invite.code}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `Your nanny agreement is ready: ${inviteLink}\nYour code: ${invite.code}`,
                        );
                        toast.success("Invitation copied — paste it into a message or email.");
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Copy invitation
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={inviteBusy}
                      onClick={() => makeInvite(true)}
                    >
                      New code
                    </Button>
                  </div>
                </div>
              ) : (
                <Button className="mt-3" disabled={inviteBusy} onClick={() => makeInvite(false)}>
                  {inviteBusy ? "Preparing…" : "Get my nanny's link and code"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="print-area space-y-6">
        <AgreementDocument
          data={data.data}
          version={data.version}
          issuedAt={data.issuedAt}
          familyName={data.familyName}
        />

        <Card>
          <h2 className="heading-display text-lg text-foreground">Signatures</h2>
          <div className="mt-3">
            <SignatureList signatures={signatures} />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="heading-display text-lg text-foreground">Sign this agreement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Typing your name below counts as your signature. We record your name, the date and time,
          and the version you signed.
        </p>
        <div className="mt-4 space-y-6">
          {!isNanny && (
            <SignForm
              role="parent"
              statement="I am the parent or employer and I agree to this nanny agreement."
              onSign={onSign}
              disabled={!issued}
            />
          )}
          <div className={isNanny ? "" : "border-t border-border pt-5"}>
            <SignForm
              role="nanny"
              statement="I am the nanny or manny named above and I agree to this agreement."
              onSign={onSign}
              disabled={!issued}
            />
          </div>
        </div>
      </Card>

      {!isNanny && (
        <div className="flex flex-wrap gap-3 print:hidden">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit agreement
          </Button>
        </div>
      )}
    </div>
  );

  if (isNanny) {
    return (
      <div className="min-h-screen bg-sand">
        <div className="mx-auto max-w-2xl px-5 py-8">
          <h1 className="heading-display text-3xl leading-tight text-primary">
            {data.familyName} — nanny agreement
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Read your agreement in full and sign it here. Your signed copy is kept in the family's
            wallet.
          </p>
          <div className="mt-6">{body}</div>
        </div>
      </div>
    );
  }

  return (
    <HubPage
      slug={slug}
      title="Your nanny agreement"
      intro="Read it here, sign it here. Your signed copy stays in your wallet."
    >
      {body}
    </HubPage>
  );
}
