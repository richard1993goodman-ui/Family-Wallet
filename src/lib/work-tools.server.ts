import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch } from "./ai-gateway.server";
import { accessLevel } from "./wallet.server";
import type { ActivityIdea, MealIdea, ResourceKind, ShiftInput } from "./work-tools.model";

async function sharedFamily(slug: string) {
  const access = await accessLevel(slug);
  if (!access) return null;
  const { data } = await supabaseAdmin
    .from("families")
    .select("id, family_name")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return data ? { ...data, access } : null;
}

const ActivitySchema = z.object({
  activities: z.array(z.object({
    title: z.string(), hook: z.string(), ageRange: z.string(), duration: z.string(),
    setting: z.string(), cost: z.string(), whatYouNeed: z.array(z.string()),
    steps: z.array(z.string()), safetyNote: z.string(), whyKidsLoveIt: z.string(),
  })),
});

const MealSchema = z.object({
  ideas: z.array(z.object({
    title: z.string(), hook: z.string(), category: z.string(), ageRange: z.string(),
    totalTime: z.string(), ingredients: z.array(z.string()), steps: z.array(z.string()),
    nutritionNote: z.string(), safetyNote: z.string(), childJob: z.string(),
  })),
});

async function familyContext(familyId: string) {
  const [{ data: children }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("family_children").select("name, date_of_birth, interests, allergies, dietary").eq("family_id", familyId),
    supabaseAdmin.from("family_profile").select("medical_notes").eq("family_id", familyId).maybeSingle(),
  ]);
  return { children: children ?? [], medicalNotes: profile?.medical_notes ?? null };
}

async function generateStructured<T>(prompt: string, schema: z.ZodType<T>) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false as const, error: "AI ideas are not configured yet." };
  try {
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({ schema }),
      prompt,
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
    return { ok: true as const, data: await result.output };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return { ok: false as const, error: "No suitable ideas came back. Please try again." };
    }
    const message = error instanceof Error ? error.message : "Ideas could not be created.";
    return { ok: false as const, error: message };
  }
}

export async function generateActivityIdeas(slug: string, input: { setting: string; minutes: number; energy: string; notes: string }) {
  const family = await sharedFamily(slug);
  if (!family) return { ok: false as const, error: "Please sign in again." };
  const context = await familyContext(family.id);
  const result = await generateStructured(
    `Create exactly four safe, practical activities for this UK family. Children: ${JSON.stringify(context.children)}. Medical notes: ${context.medicalNotes ?? "none"}. Setting: ${input.setting}. Available time: ${input.minutes} minutes. Energy: ${input.energy}. Request: ${input.notes || "any suitable activity"}. Use ordinary supplies, concise steps, a specific adult safety note, and never invent local venues.`,
    ActivitySchema,
  );
  if (!result.ok) return result;
  return { ok: true as const, activities: result.data.activities.slice(0, 4) as ActivityIdea[] };
}

export async function generateMealIdeas(slug: string, input: { category: string; minutes: number; ingredients: string; notes: string }) {
  const family = await sharedFamily(slug);
  if (!family) return { ok: false as const, error: "Please sign in again." };
  const context = await familyContext(family.id);
  const result = await generateStructured(
    `Create exactly four practical ${input.category} ideas for this UK family. Children and dietary details: ${JSON.stringify(context.children)}. Medical notes: ${context.medicalNotes ?? "none"}. Time available: ${input.minutes} minutes. Ingredients available: ${input.ingredients || "not specified"}. Request: ${input.notes || "none"}. Use UK supermarket ingredients and metric quantities. Honour allergies strictly. Include concise steps, a useful child job, nutrition note without medical claims, and a specific adult safety note.`,
    MealSchema,
  );
  if (!result.ok) return result;
  return { ok: true as const, ideas: result.data.ideas.slice(0, 4) as MealIdea[] };
}

export async function listSavedResources(slug: string, kind: ResourceKind) {
  const family = await sharedFamily(slug);
  if (!family) return null;
  const { data } = await supabaseAdmin
    .from("saved_resources")
    .select("id, resource_type, title, summary, details, saved_by, created_at")
    .eq("family_id", family.id)
    .eq("resource_type", kind)
    .order("created_at", { ascending: false });
  return { access: family.access, resources: data ?? [] };
}

export async function saveResource(slug: string, kind: ResourceKind, item: ActivityIdea | MealIdea) {
  const family = await sharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const summary = "hook" in item ? item.hook : "";
  const { data, error } = await supabaseAdmin.from("saved_resources").insert({
    family_id: family.id,
    resource_type: kind,
    title: item.title.slice(0, 180),
    summary: summary.slice(0, 500),
    details: item as unknown as Json,
    saved_by: family.access,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addResourceToCalendar(slug: string, resourceId: string, entryDate: string, timeLabel: string) {
  const family = await sharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const { data: resource } = await supabaseAdmin.from("saved_resources").select("id, title, resource_type").eq("id", resourceId).eq("family_id", family.id).maybeSingle();
  if (!resource) throw new Error("Saved idea not found.");
  const { error } = await supabaseAdmin.from("planner_entries").insert({
    family_id: family.id,
    entry_date: entryDate,
    time_label: timeLabel || null,
    title: resource.title,
    entry_type: resource.resource_type,
    added_by: family.access,
    notes: `Saved ${resource.resource_type}`,
  });
  if (error) throw new Error(error.message);
}

export async function loadTimesheets(slug: string) {
  const family = await sharedFamily(slug);
  if (!family) return null;
  const { data } = await supabaseAdmin.from("timesheet_shifts").select("*").eq("family_id", family.id).order("shift_date", { ascending: false }).order("created_at", { ascending: false });
  return { access: family.access, shifts: data ?? [] };
}

export async function submitShift(slug: string, input: ShiftInput) {
  const family = await sharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const { data, error } = await supabaseAdmin.from("timesheet_shifts").insert({
    family_id: family.id,
    shift_date: input.shiftDate,
    start_time: input.startTime,
    end_time: input.endTime,
    break_minutes: Math.max(0, Math.min(720, input.breakMinutes || 0)),
    is_overnight: input.isOvernight,
    hourly_rate: Math.max(0, input.hourlyRate || 0),
    notes: input.notes?.trim().slice(0, 1000) || null,
    submitted_by: family.access,
    status: family.access === "family" ? "approved" : "pending",
    reviewed_at: family.access === "family" ? new Date().toISOString() : null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("planner_entries").insert({
    family_id: family.id,
    entry_date: input.shiftDate,
    time_label: input.startTime,
    end_time_label: input.endTime,
    title: "Nanny shift",
    entry_type: "shift",
    added_by: family.access,
    notes: input.notes?.trim().slice(0, 1000) || null,
  });
  return data;
}

export async function reviewShift(slug: string, id: string, status: "approved" | "declined") {
  const family = await sharedFamily(slug);
  if (!family || family.access !== "family") throw new Error("Only a parent can review shifts.");
  const { error } = await supabaseAdmin.from("timesheet_shifts").update({ status, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("family_id", family.id);
  if (error) throw new Error(error.message);
}
