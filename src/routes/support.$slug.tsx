import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { askSupportFn, getSupport, markThreadReadFn, replyAsFamilyFn } from "@/lib/family.functions";
import { Card, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/support/$slug")({
  head: () => ({
    meta: [
      { title: "Ask Athlete Mannies — Support" },
      {
        name: "description",
        content:
          "Ask the Athlete Mannies team anything about your nanny, pay, holidays or day-to-day childcare.",
      },
      { property: "og:title", content: "Ask Athlete Mannies — Support" },
      {
        property: "og:description",
        content: "Send a question to your Athlete Mannies team and get an answer in your wallet.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupportPage,
});

const PROMPTS = [
  "What should we pay our nanny on a bank holiday?",
  "Our nanny is away for two weeks — what are our options?",
  "Our 6-year-old won't leave the playground. Any ideas?",
  "How does the replacement guarantee work?",
];

function SupportPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getSupport);
  const askFn = useServerFn(askSupportFn);
  const replyFn = useServerFn(replyAsFamilyFn);
  const readFn = useServerFn(markThreadReadFn);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ["support", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["support", slug] });
  }

  async function onAsk() {
    setBusy(true);
    try {
      await askFn({ data: { slug, subject, body } });
      setSubject("");
      setBody("");
      toast.success("Sent — we'll reply here");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send that");
    } finally {
      setBusy(false);
    }
  }

  return (
    <HubPage
      slug={slug}
      title="Ask Athlete Mannies"
      intro="Anything at all — pay, holidays, behaviour, a replacement nanny. We answer here in your wallet."
    >
      <Card>
        <Input
          placeholder="Subject (optional)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Textarea
          className="mt-3"
          rows={4}
          placeholder="Type your question…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setBody(prompt)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
        <Button className="mt-4" onClick={onAsk} disabled={busy || !body.trim()}>
          {busy ? "Sending…" : "Send question"}
        </Button>
      </Card>

      <div className="mt-6 space-y-3">
        {query.data.threads.map((thread) => (
          <Card key={thread.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="heading-display text-lg text-foreground">{thread.subject}</p>
              {thread.family_unread && (
                <button
                  className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-foreground"
                  onClick={async () => {
                    await readFn({ data: { slug, threadId: thread.id } });
                    await refresh();
                  }}
                >
                  New reply
                </button>
              )}
            </div>
            <div className="mt-3 space-y-3">
              {thread.messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-lg p-3 text-sm ${
                    message.sender === "admin"
                      ? "bg-accent/60 text-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {message.sender === "admin" ? "Athlete Mannies" : "You"}
                  </p>
                  <p className="mt-1 whitespace-pre-line">{message.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Reply…"
                value={replies[thread.id] ?? ""}
                onChange={(e) => setReplies({ ...replies, [thread.id]: e.target.value })}
              />
              <Button
                variant="outline"
                onClick={async () => {
                  const text = replies[thread.id] ?? "";
                  if (!text.trim()) return;
                  await replyFn({ data: { slug, threadId: thread.id, body: text } });
                  setReplies({ ...replies, [thread.id]: "" });
                  await refresh();
                }}
              >
                Send
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </HubPage>
  );
}
