import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Pencil, Printer, Sparkles, UserPlus } from "lucide-react";

import {
  generateAgreementDraftFn,
  generateStatementFn,
  getAgreement,
  getNannyInvite,
  saveAgreementFn,
  signDocumentFn,
} from "@/lib/agreement.functions";
import type { AgreementData, DocumentStyle } from "@/lib/agreement.model";
import { DOCUMENT_STYLE_LABELS } from "@/lib/agreement.model";
import { AgreementChoice } from "@/components/AgreementChoice";
import { AgreementDocument } from "@/components/AgreementDocument";
import { getWalletSummary } from "@/lib/wallet.functions";
import { getPlanAccessFn } from "@/lib/plan-access.functions";
import { UpgradeToHousehold } from "@/components/UpgradeToHousehold";
import { AgreementBuilder } from "@/components/AgreementBuilder";
import { StatementBuilder } from "@/components/StatementBuilder";
import { StatementDocument } from "@/components/StatementDocument";
import { SelfEmployedBuilder } from "@/components/SelfEmployedBuilder";
import { SelfEmployedDocument } from "@/components/SelfEmployedDocument";
import { HubPage, LockedNotice, Card, BackToWallet } from "@/components/hub-ui";
import { SignForm, SignatureList } from "@/components/SignBlock";
import { SigningProgress } from "@/components/SigningProgress";
import { siteUrl } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgreementHistory } from "@/components/AgreementHistory";
import { useT } from "@/lib/i18n/provider";

export const Route = createFileRoute("/agreement/$slug")({
  validateSearch: (search: Record<string, unknown>): { nanny?: string; start?: "employed" | "self_employed" } => ({
    ...(typeof search["nanny"] === "string" ? { nanny: search["nanny"] as string } : {}),
    ...(search["start"] === "employed" || search["start"] === "self_employed" ? { start: search["start"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Your nanny agreement — Family Wallet" },
      {
        name: "description",
        content:
          "Build, read and sign your full nanny employment contract inside your Family Wallet — no printing, no email attachments.",
      },
      { property: "og:title", content: "Your nanny agreement — Family Wallet" },
      {
        property: "og:description",
        content: "Build, read and sign your nanny employment contract inside your Family Wallet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgreementPage,
});

function AgreementPageInner() {
  const t = useT();
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getAgreement);
  const signFn = useServerFn(signDocumentFn);
  const saveFn = useServerFn(saveAgreementFn);
  const generateFn = useServerFn(generateAgreementDraftFn);
  const statementFn = useServerFn(generateStatementFn);
  const inviteFn = useServerFn(getNannyInvite);

  const [nannyId, setNannyId] = useState(search.nanny ?? "");

  const query = useQuery({
    queryKey: ["agreement", slug, nannyId],
    queryFn: () => loadFn({ data: { slug, nannyId: nannyId || null } }),
  });

  const [draft, setDraft] = useState<AgreementData | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ code: string } | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);

  const data = query.data;
  const isNanny = data?.access === "nanny";

  useEffect(() => {
    if (!data) return;
    setDraft(
      !data.hasContent && data.access === "family" && search.start === "self_employed"
        ? { ...data.data, documentStyle: "self_employed", standardNotice: data.data.standardNotice === "4 weeks" ? "2 weeks" : data.data.standardNotice }
        : (data.pendingChanges ?? data.data),
    );
    if (data.nannyId && !nannyId) setNannyId(data.nannyId);
    if (!data.hasContent && data.access === "family") {
      setEditing(true);
      // Already chosen on the sign-in screen? Go straight to the builder.
      setChoosing(!search.start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const result = await saveFn({
        data: { slug, data: draft, publish, nannyId: nannyId || null },
      });
      if (!result.ok) {
        toast.error("Please unlock your wallet again.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["agreement", slug] });
      await queryClient.invalidateQueries({ queryKey: ["nannies", slug] });
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

  async function generateStatement() {
    if (!draft) return;
    setGenerating(true);
    setAiSummary(null);
    try {
      const result = await statementFn({ data: { slug, data: draft, notes } });
      if (!result.ok) {
        toast.error(
          result.reason === "locked"
            ? "Please unlock your wallet again."
            : "We couldn't write a statement just now. Please try again in a moment.",
        );
        return;
      }
      const s = result.statement;
      setDraft((current) =>
        current
          ? {
              ...current,
              jobTitle: s.jobTitle || current.jobTitle,
              statementBody: s.statementBody || current.statementBody,
            }
          : current,
      );
      setAiSummary(s.summary);
      toast.success("Statement written — please read it through and edit anything you'd like.");
    } finally {
      setGenerating(false);
    }
  }

  function chooseStyle(style: DocumentStyle) {
    setDraft((current) =>
      current
        ? {
            ...current,
            documentStyle: style,
            // The employed default of 4 weeks is too long for a services agreement.
            ...(style === "self_employed" && current.standardNotice === "4 weeks" ? { standardNotice: "2 weeks" } : {}),
          }
        : current,
    );
    setChoosing(false);
    setEditing(true);
  }

  async function makeInvite(regenerate: boolean) {
    if (!data?.nannyId) {
      toast.error("Add a nanny first.");
      return;
    }
    setInviteBusy(true);
    try {
      const result = await inviteFn({ data: { slug, nannyId: data.nannyId, regenerate } });
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
      data: {
        slug,
        docKind: "agreement" as const,
        signerRole: role,
        signerName: name,
        nannyId: nannyId || null,
      },
    });
    if (result.ok) {
      toast.success("Signed and saved to the wallet.");
      await queryClient.invalidateQueries({ queryKey: ["agreement", slug] });
      await queryClient.invalidateQueries({ queryKey: ["nannies", slug] });
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
  const inviteLink = siteUrl(`/nanny/${slug}`);
  const emergency = data.emergency;
  const hasEmergencyDetails = Boolean(
    emergency.homeAddress || emergency.children.length || emergency.contacts.length,
  );

  if (choosing && draft && !isNanny) {
    const currentLabel = DOCUMENT_STYLE_LABELS[draft.documentStyle];
    return (
      <HubPage
        slug={slug}
        title="How would you like your agreement written?"
        intro="Each is proper written terms your nanny can sign. Pick whichever suits your family. You can change your mind later."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <h2 className="heading-display text-lg text-foreground">Full nanny contract</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The complete, formal employment contract: every duty, holiday calculations, sickness,
              pension, notice, grievance and disciplinary wording. Best if you want everything
              spelled out.
            </p>
            <Button className="mt-4" onClick={() => chooseStyle("full")}>
              Use the full contract
            </Button>
          </Card>
          <Card>
            <h2 className="heading-display text-lg text-foreground">Simple written statement</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A short, plain-English statement written for you from the basics — days, hours, start
              date and pay. Quick to do, and it still covers what the law requires.
            </p>
            <Button className="mt-4" onClick={() => chooseStyle("statement")}>
              Write a simple statement
            </Button>
          </Card>
          <Card>
            <h2 className="heading-display text-lg text-foreground">Self-employed agreement</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              For a nanny who is genuinely in business for themselves: they invoice you, carry their own insurance and can send a
              substitute. Most live-out nannies are employees, so check first.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => chooseStyle("self_employed")}>
              Use the self-employed agreement
            </Button>
          </Card>
        </div>
        {data.hasContent && (
          <div className="mt-5">
            <p className="text-sm text-muted-foreground">
              You are currently using:{" "}
              <span className="font-medium text-foreground">{currentLabel}</span>
            </p>
            <Button variant="outline" className="mt-3" onClick={() => setChoosing(false)}>
              Keep my current format and continue
            </Button>
          </div>
        )}
      </HubPage>
    );
  }

  if (editing && draft && !isNanny && draft.documentStyle === "self_employed") {
    return (
      <HubPage
        slug={slug}
        title="Your self-employed agreement"
        intro="Fill this in with your nanny. The sessions fill in your family calendar. You can save and come back at any time."
      >
        <div className="space-y-5">
          <SelfEmployedBuilder data={draft} onChange={setDraft} />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" disabled={busy} onClick={() => save(false)}>
              Save and finish later
            </Button>
            <Button disabled={busy} onClick={() => save(true)}>
              {issued ? "Save and re-issue for signing" : "Done — ready to sign"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setChoosing(true)}>
              Choose a different agreement
            </Button>
            {data.hasContent && (
              <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </HubPage>
    );
  }

  if (editing && draft && !isNanny && draft.documentStyle === "statement") {
    return (
      <HubPage
        slug={slug}
        title="Your written statement"
        intro="Give us the basics and we'll write the statement for you. You can edit every word."
      >
        <div className="space-y-5">
          <Card>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div className="flex-1">
                <h2 className="heading-display text-lg text-foreground">
                  Write my statement for me
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fill in the basics below, then add anything else in your own words — the school
                  run, bedtime, mileage. We'll turn it into a short statement your nanny can sign.
                </p>
                <Textarea
                  className="mt-3"
                  rows={3}
                  value={notes}
                  placeholder="e.g. Two boys, 8 and 5. School pick-up at 3.30pm, tea, homework and bedtime. Term time only."
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button className="mt-3" disabled={generating} onClick={generateStatement}>
                  {generating ? "Writing your statement…" : "Write my statement"}
                </Button>
                {aiSummary && (
                  <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {aiSummary}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Always read it through. Nothing is sent to your nanny until you mark it ready to
                  sign.
                </p>
              </div>
            </div>
          </Card>

          <StatementBuilder data={draft} onChange={setDraft} />

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" disabled={busy} onClick={() => save(false)}>
              Save and finish later
            </Button>
            <Button disabled={busy} onClick={() => save(true)}>
              {issued ? "Save and re-issue for signing" : "Done — ready to sign"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setChoosing(true)}>
              Switch to the full contract
            </Button>
            {data.hasContent && (
              <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </HubPage>
    );
  }

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
            <Button variant="ghost" disabled={busy} onClick={() => setChoosing(true)}>
              Switch to a simple statement
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
      {!isNanny && data.nannies.length > 1 && (
        <Card>
          <p className="text-xs font-medium text-muted-foreground">
            Whose agreement
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.nannies.map((nanny) => (
              <Button
                key={nanny.id}
                size="sm"
                variant={nanny.id === data.nannyId ? "default" : "outline"}
                onClick={() => setNannyId(nanny.id)}
              >
                {nanny.name}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {!isNanny && data.nannies.length > 1 && (
        <p className="text-sm text-muted-foreground print:hidden">
          You are viewing {data.nannyName ?? "your nanny"}'s agreement.
        </p>
      )}

      {!isNanny && (
        <div className="flex flex-wrap gap-3 print:hidden">
          <Button
            onClick={() => {
              setEditing(true);
              setChoosing(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit agreement
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print or save as PDF
          </Button>
          <Button variant="outline" onClick={() => setChoosing(true)}>
            Change format
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

      {data.pendingChanges && !isNanny && (
        <Card>
          <h2 className="font-medium text-foreground">{t("agr.pendingTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("agr.pendingBody")}</p>
        </Card>
      )}

      <div className="print-area space-y-6">
        {data.data.documentStyle === "self_employed" ? (
          <SelfEmployedDocument
            data={data.data}
            version={data.version}
            issuedAt={data.issuedAt}
            familyName={data.familyName}
          />
        ) : data.data.documentStyle === "statement" ? (
          <StatementDocument
            data={data.data}
            version={data.version}
            issuedAt={data.issuedAt}
            familyName={data.familyName}
          />
        ) : (
          <AgreementDocument
            data={data.data}
            version={data.version}
            issuedAt={data.issuedAt}
            familyName={data.familyName}
          />
        )}

        <Card>
          <h2 className="heading-display text-lg text-foreground">Signatures</h2>
          <div className="mt-3">
            <SignatureList signatures={signatures} />
          </div>
        </Card>
      </div>

      <AgreementHistory history={data.history} />

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
          <Button
            variant="outline"
            onClick={() => {
              setEditing(true);
              setChoosing(true);
            }}
          >
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
          <BackToWallet slug={slug} />
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

function AgreementPage() {
  const { slug } = Route.useParams();
  const summaryFn = useServerFn(getWalletSummary);
  const summary = useQuery({ queryKey: ["wallet", slug], queryFn: () => summaryFn({ data: { slug } }) });
  const planFn = useServerFn(getPlanAccessFn);
  const plan = useQuery({ queryKey: ["plan-access", slug, "agreement"], queryFn: () => planFn({ data: { slug, feature: "agreement" } }) });
  const wallet = summary.data?.unlocked ? summary.data.wallet : null;
  if (wallet && !wallet.agreementsEnabled) {
    return (
      <HubPage
        slug={slug}
        title="Nanny agreement"
        intro="This household isn't using the nanny agreement in the wallet."
      >
        <AgreementChoice slug={slug} />
      </HubPage>
    );
  }
  if (plan.data && !plan.data.allowed) {
    return <UpgradeToHousehold slug={slug} title="Nanny agreement" isNanny={plan.data.access === "nanny"}
      what="Build, sign and store your carer's employment agreement in the wallet." />;
  }
  if (plan.isLoading) return null;
  return <AgreementPageInner />;
}
