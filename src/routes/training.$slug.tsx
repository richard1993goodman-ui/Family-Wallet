import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Award, CheckCircle2, XCircle } from "lucide-react";

import { getTraining, submitTrainingFn } from "@/lib/training.functions";
import { PASS_MARK, TRAINING_QUESTIONS } from "@/lib/training.questions";
import { Card, Field, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/training/$slug")({
  head: () => ({
    meta: [
      { title: "Nanny Training Hub — The Family Wallet" },
      {
        name: "description",
        content:
          "A 20-question training check for after-school nannies: routine, safeguarding, emergencies, food and professional conduct, with a completion certificate.",
      },
      { property: "og:title", content: "Nanny Training Hub — The Family Wallet" },
      {
        property: "og:description",
        content: "Complete the training quiz and earn a certificate in your Family Wallet.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainingPage,
});

type Result = {
  id: string;
  certificateRef: string;
  score: number;
  total: number;
  passed: boolean;
  results: {
    id: string;
    question: string;
    given: number | null;
    correct: number;
    isCorrect: boolean;
    explanation: string;
  }[];
};

function TrainingPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getTraining);
  const submitFn = useServerFn(submitTrainingFn);

  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const query = useQuery({
    queryKey: ["training", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });

  if (query.isLoading) {
    return (
      <PageLoading />
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  const answered = Object.keys(answers).length;

  async function onSubmit() {
    if (!name.trim()) {
      toast.error("Please add your name for the certificate");
      return;
    }
    if (answered < TRAINING_QUESTIONS.length) {
      toast.error("Please answer every question before finishing");
      return;
    }
    setBusy(true);
    try {
      const res = await submitFn({ data: { slug, learnerName: name, answers } });
      setResult(res as Result);
      setStarted(false);
      window.scrollTo({ top: 0 });
      await queryClient.invalidateQueries({ queryKey: ["training", slug] });
    } catch {
      toast.error("Couldn't submit your answers. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <HubPage
      slug={slug}
      title="Nanny training hub"
      intro={`Twenty questions on the after-school routine, safeguarding, emergencies, food and professional conduct. Score ${PASS_MARK} or more to earn a completion certificate in this wallet.`}
    >
      {result && (
        <Card>
          <div className="flex items-start gap-3">
            <Award
              className={`mt-0.5 h-6 w-6 flex-shrink-0 ${result.passed ? "text-primary" : "text-muted-foreground"}`}
            />
            <div>
              <p className="heading-display text-xl text-foreground">
                {result.score} out of {result.total}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.passed
                  ? "Passed — your certificate is ready."
                  : `Not quite. ${PASS_MARK} out of ${result.total} is needed — review the answers below and try again.`}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {result.passed && (
                  <Link
                    to="/certificate/$slug/$id"
                    params={{ slug, id: result.id }}
                    className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    View certificate
                  </Link>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                    setStarted(true);
                  }}
                >
                  Take it again
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3 border-t border-border pt-4">
            {result.results.map((r, i) => (
              <div key={r.id} className="flex items-start gap-2.5">
                {r.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {i + 1}. {r.question}
                  </p>
                  {!r.isCorrect && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Correct answer: {TRAINING_QUESTIONS[i]?.options[r.correct]}
                    </p>
                  )}
                  <p className="mt-0.5 text-sm text-muted-foreground">{r.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!started && !result && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Whoever is taking the training enters their name below — the name printed on the
            certificate.
          </p>
          <div className="mt-4 max-w-sm">
            <Field label="Your name" value={name} onChange={setName} placeholder="Jane Smith" />
          </div>
          <Button className="mt-4" onClick={() => setStarted(true)}>
            Start the training
          </Button>
        </Card>
      )}

      {started && (
        <div className="space-y-4">
          <div className="max-w-sm">
            <Field label="Your name" value={name} onChange={setName} placeholder="Jane Smith" />
          </div>
          {TRAINING_QUESTIONS.map((q, i) => (
            <Card key={q.id}>
              <p className="text-[0.8125rem] font-medium text-muted-foreground">
                {q.section}
              </p>
              <p className="mt-2 font-medium text-foreground">
                {i + 1}. {q.question}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((option, index) => {
                  const selected = answers[q.id] === index;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: index })}
                      className={`block w-full rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                        selected
                          ? "border-primary bg-accent text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onSubmit} disabled={busy}>
              {busy ? "Marking…" : "Finish and get my certificate"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {answered} of {TRAINING_QUESTIONS.length} answered
            </span>
          </div>
        </div>
      )}

      {query.data.attempts.length > 0 && (
        <>
          <h2 className="heading-display mt-9 text-lg text-foreground">Completed training</h2>
          <div className="mt-3 space-y-3">
            {query.data.attempts.map((attempt) => (
              <Card key={attempt.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{attempt.learner_name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {attempt.score}/{attempt.total} ·{" "}
                      {new Date(attempt.completed_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {attempt.passed ? ` · ${attempt.certificate_ref}` : " · not passed"}
                    </p>
                  </div>
                  {attempt.passed && (
                    <Link
                      to="/certificate/$slug/$id"
                      params={{ slug, id: attempt.id }}
                      className="text-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
                    >
                      View certificate
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </HubPage>
  );
}
