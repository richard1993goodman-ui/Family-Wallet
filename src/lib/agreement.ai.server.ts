import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch } from "./ai-gateway.server";
import { accessLevel } from "./wallet.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadEmergencyContext } from "./agreement.server";
import { calculateHoliday, type AgreementData } from "./agreement.model";

const DraftSchema = z.object({
  jobTitle: z.string(),
  overtimePolicy: z.string(),
  otherDutiesClause: z.string(),
  benefits: z.string(),
  sicknessPolicy: z.string(),
  holidayAllowance: z.string(),
  probationPeriod: z.string(),
  extraDuties: z.array(z.string()),
  summary: z.string(),
});

export type AgreementDraftSuggestion = z.infer<typeof DraftSchema>;

const StatementSchema = z.object({
  jobTitle: z.string(),
  statementBody: z.string(),
  summary: z.string(),
});

export type StatementSuggestion = z.infer<typeof StatementSchema>;

export type GenerateStatementResult =
  | { ok: true; statement: StatementSuggestion }
  | { ok: false; reason: "locked" | "config" | "unavailable"; message?: string };

export type GenerateResult =
  | { ok: true; draft: AgreementDraftSuggestion }
  | { ok: false; reason: "locked" | "config" | "unavailable"; message?: string };

function describe(data: AgreementData) {
  const days = data.workingDays
    .filter((d) => d.enabled)
    .map(
      (d) =>
        `${d.day} ${d.startTime}–${d.endTime}${d.startTime2 && d.endTime2 ? ` and ${d.startTime2}–${d.endTime2}` : ""}`,
    );
  const holiday = calculateHoliday(data.workingDays, data.contractType, data.weeksPerYear);
  const duties = data.duties.filter((d) => d.enabled).map((d) => d.label);
  return [
    `Employer: ${data.employerName || "not given"}`,
    `Nanny: ${data.nannyName || "not given"}`,
    `Work address: ${data.workAddress || "not given"}`,
    `Start date: ${data.startDate || "not given"}`,
    `Contract type: ${data.contractType}, ${data.weeksPerYear} weeks per year`,
    `Working pattern clause included: ${data.includeWorkingPatternClause ? "yes" : "no"}`,
    `School holiday work: ${data.allowSchoolHolidayWork ? "may be offered if needed and the nanny is available, by agreement only" : "not included"}`,
    `Working days: ${days.length ? days.join("; ") : "not set"}`,
    `Weekly hours: ${holiday.weeklyHours}`,
    `Holiday clause included: ${data.includeHolidayEntitlement ? "yes" : "no"}`,
    `Pro-rata holiday: ${holiday.totalWeeksEntitlement} weeks (${holiday.totalDaysEntitlement} days)`,
    `Hourly rate: ${data.hourlyRate || "not given"} (${data.rateBasis === "net" ? "net / take-home" : "gross"})`,
    `Tax responsibility wording included in clause 2.1: ${data.includeTaxResponsibilityClause ? "yes" : "no"}`,
    `Pay frequency: ${data.paymentFrequency || "not given"}`,
    `Duties already ticked: ${duties.slice(0, 20).join("; ") || "none"}`,
  ].join("\n");
}

/**
 * Generates a personalised first draft of the wording sections of the nanny
 * agreement from the family's own details. The parent always reviews and edits
 * the result before anything is issued for signing.
 */
export async function generateAgreementDraft(
  slug: string,
  data: AgreementData,
  notes: string,
): Promise<GenerateResult> {
  if ((await accessLevel(slug)) !== "family") return { ok: false, reason: "locked" };

  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { ok: false, reason: "config" };

  const { data: family } = await supabaseAdmin
    .from("families")
    .select("id, family_name")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!family) return { ok: false, reason: "locked" };

  const emergency = await loadEmergencyContext(family.id);
  const childLines = emergency.children.map(
    (c) =>
      `- ${c.name}${c.school ? `, ${c.school}` : ""}${c.allergies ? `, allergies: ${c.allergies}` : ""}${c.medication ? `, medication: ${c.medication}` : ""}`,
  );

  const prompt = [
    "You are drafting sections of a UK nanny employment agreement for a family using the Athlete Mannies & Nannies service.",
    "Write clear, plain British English suitable for a private household employment contract. Be specific to this family. Do not invent facts that are not given; leave general wording where a detail is missing.",
    "",
    "Agreement details so far:",
    describe(data),
    "",
    "Household and emergency card details:",
    `Home address: ${emergency.homeAddress ?? "not given"}`,
    `GP: ${emergency.gpDetails ?? "not given"}`,
    `Medical notes: ${emergency.medicalNotes ?? "none"}`,
    `Emergency instructions: ${emergency.emergencyInstructions ?? "none"}`,
    childLines.length ? `Children:\n${childLines.join("\n")}` : "Children: none listed",
    "",
    "What the parents have told us in their own words:",
    notes || "(nothing extra)",
    "",
    "Return: jobTitle (short, e.g. After-school Nanny); overtimePolicy; otherDutiesClause (a catch-all duties paragraph that also reflects this family's routine, allergies and medication needs); benefits; sicknessPolicy; holidayAllowance (one sentence stating the pro-rata entitlement above only if the holiday clause is included; otherwise return an empty string); probationPeriod (e.g. '3 months'); extraDuties (short duty lines specific to this family, at most six, each under 160 characters); summary (two sentences telling the parent what was drafted).",
  ].join("\n");

  try {
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      prompt,
      output: Output.object({ schema: DraftSchema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const draft = await result.output;
    return {
      ok: true,
      draft: { ...draft, extraDuties: (draft.extraDuties ?? []).slice(0, 6) },
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return { ok: false, reason: "unavailable", message: "The draft came back incomplete." };
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, reason: "unavailable", message };
  }
}

/**
 * Writes a short, plain-English written statement of employment particulars
 * from the key facts only — the simpler alternative to the full contract.
 */
export async function generateWrittenStatement(
  slug: string,
  data: AgreementData,
  notes: string,
): Promise<GenerateStatementResult> {
  if ((await accessLevel(slug)) !== "family") return { ok: false, reason: "locked" };

  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { ok: false, reason: "config" };

  const prompt = [
    "You are writing a UK written statement of employment particulars (Employment Rights Act 1996, section 1) for a family employing a nanny through Athlete Mannies & Nannies.",
    "This is the SHORT, friendly alternative to a long formal contract. Write in plain British English, warm but precise, using short paragraphs. Do not invent facts; where a detail is missing, use neutral wording such as 'to be agreed'.",
    "",
    "Key details:",
    describe(data),
    "",
    "What the parents told us in their own words:",
    notes || "(nothing extra)",
    "",
    "Return statementBody as plain text with short section headings on their own line (for example: Your job, Days and hours, Pay, Holiday, Sickness, Notice, Confidentiality and safeguarding, Changes to this statement). Cover the legally required particulars: names, job title, start date, place of work, days and hours, pay and how it is paid, holiday entitlement, sickness, notice on both sides, and how changes are agreed. Keep the whole statement under 700 words. Do not use markdown, bullet characters or numbering.",
    "Also return jobTitle (short) and summary (two sentences telling the parent what was written).",
  ].join("\n");

  try {
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      prompt,
      output: Output.object({ schema: StatementSchema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const statement = await result.output;
    return { ok: true, statement };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return { ok: false, reason: "unavailable", message: "The draft came back incomplete." };
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, reason: "unavailable", message };
  }
}
