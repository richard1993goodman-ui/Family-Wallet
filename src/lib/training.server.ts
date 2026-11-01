import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireFamily } from "./family.server";
import { PASS_MARK, TRAINING_QUESTIONS } from "./training.questions";

const ANSWERS: Record<string, { correct: number; explanation: string }> = {
  q1: {
    correct: 1,
    explanation:
      "Always collect from the agreed point and make sure the school knows who is collecting.",
  },
  q2: {
    correct: 1,
    explanation: "Children settle best with the family's own predictable routine.",
  },
  q3: {
    correct: 2,
    explanation: "Check the planner calmly and note it for the parents rather than guessing.",
  },
  q4: { correct: 2, explanation: "Screen rules belong to the family, not the nanny." },
  q5: {
    correct: 1,
    explanation: "A short written log gives parents the day at a glance.",
  },
  q6: {
    correct: 1,
    explanation: "Safeguarding is about preventing harm and acting on concerns, not just injuries.",
  },
  q7: {
    correct: 2,
    explanation:
      "Listen, never promise to keep it secret, avoid leading questions, and record their words.",
  },
  q8: {
    correct: 2,
    explanation: "Serious concerns are reported the same day; never investigate it yourself.",
  },
  q9: { correct: 0, explanation: "Children's images never go on a nanny's social media." },
  q10: {
    correct: 1,
    explanation: "Never release a child to an unauthorised adult; confirm with the parent first.",
  },
  q11: {
    correct: 2,
    explanation: "Transparency and clear boundaries protect both the child and you.",
  },
  q12: {
    correct: 1,
    explanation: "Recovery position, call 999, and stay with the child.",
  },
  q13: {
    correct: 1,
    explanation: "Adrenaline first, then 999 — never delay to make other calls.",
  },
  q14: {
    correct: 2,
    explanation: "An effective cough clears most obstructions; intervene only if it becomes weak.",
  },
  q15: {
    correct: 1,
    explanation: "It puts the critical details in one place for a stressful moment.",
  },
  q16: {
    correct: 1,
    explanation: "Same-day reporting with a written record protects everyone.",
  },
  q17: { correct: 0, explanation: "Allergy and dietary notes are checked every time." },
  q18: {
    correct: 1,
    explanation: "Written parental permission, correct dose, and a written record.",
  },
  q19: {
    correct: 1,
    explanation: "Calm co-regulation works better than punishment after a hard school day.",
  },
  q20: {
    correct: 1,
    explanation: "Tell the parents and the school straight away so a child is never left waiting.",
  },
};

function makeRef() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `AM-${out}`;
}

export async function loadTraining(slug: string) {
  const family = await requireFamily(slug);
  if (!family) return null;
  const { data } = await supabaseAdmin
    .from("training_attempts")
    .select("id, learner_name, score, total, passed, certificate_ref, completed_at")
    .eq("family_id", family.id)
    .order("completed_at", { ascending: false })
    .limit(20);
  return {
    familyName: family.family_name,
    nannyName: family.nanny_name,
    attempts: data ?? [],
  };
}

export async function submitTraining(
  slug: string,
  learnerName: string,
  answers: Record<string, number>,
) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Locked");
  const name = (learnerName ?? "").trim().slice(0, 80);
  if (!name) throw new Error("Please enter your name");

  const results = TRAINING_QUESTIONS.map((q) => {
    const key = ANSWERS[q.id]!;
    const given = answers[q.id];
    return {
      id: q.id,
      question: q.question,
      given: typeof given === "number" ? given : null,
      correct: key.correct,
      isCorrect: given === key.correct,
      explanation: key.explanation,
    };
  });

  const score = results.filter((r) => r.isCorrect).length;
  const total = TRAINING_QUESTIONS.length;
  const passed = score >= PASS_MARK;

  const { data, error } = await supabaseAdmin
    .from("training_attempts")
    .insert({
      family_id: family.id,
      learner_name: name,
      score,
      total,
      passed,
      certificate_ref: makeRef(),
      answers: results.reduce<Record<string, number | null>>((acc, r) => {
        acc[r.id] = r.given;
        return acc;
      }, {}),
    })
    .select("id, certificate_ref")
    .single();
  if (error) throw new Error(error.message);

  return { id: data.id, certificateRef: data.certificate_ref, score, total, passed, results };
}

export async function loadCertificate(slug: string, id: string) {
  const family = await requireFamily(slug);
  if (!family) return null;
  const { data } = await supabaseAdmin
    .from("training_attempts")
    .select("id, learner_name, score, total, passed, certificate_ref, completed_at")
    .eq("id", id)
    .eq("family_id", family.id)
    .maybeSingle();
  if (!data || !data.passed) return null;
  return { ...data, familyName: family.family_name };
}
