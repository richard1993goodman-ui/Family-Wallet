// Day recap (V2, decided 16 Nov). Writes a short, warm recap of each child's day from that day's log, once per child
// per day, and stores it in day_recaps. It runs only for a signed-in member of the household, and only when a parent
// has switched recaps on. The log is read as that person, so the database's own rules decide what can be seen.
// What leaves the database: each child's first name and the day's entries. Nothing else about the family is sent.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

// The small, fast model the owner chose for this (16 Nov). A recap is a few sentences, so effort stays low.
const MODEL = "claude-haiku-5-5";

const SYSTEM = `You write a short evening recap of one child's day for their parents, from the carer's log.

Rules:
- Use only what is in the log. Never add, guess or infer anything that is not written there.
- Three or four warm, plain sentences in British English, in the past tense. No headings, lists or emoji.
- Use the child's first name. Do not give advice, opinions, or comments on health, behaviour or development.
- If medicine was given, say so exactly as logged: the medicine, the dose and the time. Do not soften or reword it.
- If an incident is logged, state plainly what the log says happened and when. Do not reassure, judge or speculate.
- If the log is short, write a short recap. Do not pad it.
- Reply with the recap only.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const UUID = /^[0-9a-f-]{36}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const KIND: Record<string, string> = {
  feed: "Feed",
  bottle: "Bottle",
  meal: "Meal",
  nap: "Nap",
  wet_nappy: "Wet nappy",
  dirty_nappy: "Dirty nappy",
  nappy: "Nappy",
  potty: "Potty",
  activity: "Activity",
  note: "Note",
};
const time = (ts: string) =>
  new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
const first = (name: string) => name.trim().split(/\s+/)[0];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { family, day, from, to } = await req.json();
    if (
      !UUID.test(family ?? "") ||
      !DAY.test(day ?? "") ||
      !STAMP.test(from ?? "") ||
      !STAMP.test(to ?? "")
    ) {
      return json({ error: "Bad request" }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    // As the signed-in person: every read below goes through the household's own access rules.
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const on = await asUser.rpc("ai_recap_on", { _family: family });
    if (on.error) return json({ error: on.error.message }, 400);
    if (on.data === null) return json({ error: "Not part of this household" }, 403);
    if (!on.data) return json({ recaps: [], off: true });

    const [kids, events, meds, incidents, moments, have] = await Promise.all([
      asUser.from("family_children").select("id, name").eq("family_id", family).order("sort_order"),
      asUser
        .from("care_events")
        .select("child_id, kind, started_at, amount_ml, detail")
        .eq("family_id", family)
        .gte("started_at", from)
        .lt("started_at", to)
        .order("started_at"),
      asUser
        .from("medication_doses")
        .select("child_name, medicine, dose, given_at")
        .eq("family_id", family)
        .gte("given_at", from)
        .lt("given_at", to)
        .order("given_at"),
      asUser
        .from("incident_reports")
        .select("child_name, occurred_at, what_happened")
        .eq("family_id", family)
        .gte("occurred_at", from)
        .lt("occurred_at", to)
        .order("occurred_at"),
      asUser
        .from("family_moments")
        .select("caption, created_at")
        .eq("family_id", family)
        .gte("created_at", from)
        .lt("created_at", to)
        .order("created_at"),
      asUser.from("day_recaps").select("child_id, body").eq("family_id", family).eq("day", day),
    ]);
    const failed =
      kids.error ?? events.error ?? meds.error ?? incidents.error ?? moments.error ?? have.error;
    if (failed) return json({ error: failed.message }, 400);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ recaps: have.data, error: "The AI key is not set up yet." });
    const anthropic = new Anthropic({ apiKey });
    // Only the server may write a recap; the people in the household can read them.
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const recaps = [...(have.data ?? [])];
    let wrote = 0;
    for (const kid of kids.data ?? []) {
      if (recaps.some((r) => r.child_id === kid.id)) continue;
      const name = first(kid.name);
      const mine = (n: string | null) => !!n && (n === kid.name || first(n) === name);
      const lines = [
        // An entry with no child is for all the children.
        ...(events.data ?? [])
          .filter((e) => e.child_id === kid.id || e.child_id === null)
          .map(
            (e) =>
              `${time(e.started_at)} ${KIND[e.kind] ?? e.kind}${e.amount_ml ? ` ${e.amount_ml} ml` : ""}${e.detail ? `: ${e.detail}` : ""}`,
          ),
        ...(meds.data ?? [])
          .filter((m) => mine(m.child_name))
          .map(
            (m) =>
              `${time(m.given_at)} Medicine given: ${m.medicine}${m.dose ? `, ${m.dose}` : ""}`,
          ),
        ...(incidents.data ?? [])
          .filter((i) => mine(i.child_name))
          .map((i) => `${time(i.occurred_at)} Incident: ${i.what_happened}`),
        ...(moments.data ?? [])
          .filter((p) => p.caption)
          .map((p) => `${time(p.created_at)} Photo: ${p.caption}`),
      ].sort();
      if (lines.length === 0) continue; // nothing logged for this child: no recap, rather than an invented one

      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2000,
        output_config: { effort: "low" },
        system: SYSTEM,
        messages: [
          { role: "user", content: `Child: ${name}\nDate: ${day}\nLog:\n${lines.join("\n")}` },
        ],
      });
      // A declined or cut-off reply is not stored; the plain log still shows in the app.
      if (message.stop_reason !== "end_turn") continue;
      const body = message.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      if (!body) continue;
      const saved = await admin
        .from("day_recaps")
        .upsert(
          { family_id: family, child_id: kid.id, day, body, model: MODEL },
          { onConflict: "family_id,child_id,day", ignoreDuplicates: true },
        );
      if (saved.error) return json({ recaps, error: saved.error.message });
      recaps.push({ child_id: kid.id, body });
      wrote++;
    }

    // The lock-screen text stays generic: no names and nothing from the recap.
    if (wrote > 0)
      await admin.rpc("push_to_app", {
        _family: family,
        _actor: "none",
        _kind: "recaps",
        _body: "Today’s recap is ready",
      });
    return json({ recaps });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError)
      return json({ error: "The AI service is busy. Try again shortly." }, 429);
    if (error instanceof Anthropic.AuthenticationError)
      return json({ error: "The AI key was not accepted." }, 500);
    if (error instanceof Anthropic.APIError)
      return json({ error: `AI service error ${error.status}` }, 502);
    return json({ error: error instanceof Error ? error.message : "Something went wrong" }, 500);
  }
});
