import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { askSupportFn, getSupport, markThreadReadFn, replyAsFamilyFn } from "@/lib/family.functions";
import { HubPage, LockedNotice } from "@/components/hub-ui";
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
        content: "Send a question to your Athlete Mannies team and get an answer in your vault.",
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
  const [replying, setReplying] = useState<string | null>(null);
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
  const support = query.data;

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
      intro="Anything at all — pay, holidays, behaviour, a replacement nanny. We answer here in your vault."
    >
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
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
            <Button
              key={prompt}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBody(prompt)}
              className="rounded-full text-xs text-muted-foreground"
            >
              {prompt}
            </Button>
          ))}
        </div>
        <Button className="mt-4" onClick={onAsk} disabled={busy || !body.trim()}>
          {busy ? "Sending…" : "Send question"}
        </Button>
      </div>

      <div className="mt-6 space-y-5">
        {support.threads.map((thread) => (
          <section key={thread.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="px-4 pt-4 sm:px-5 sm:pt-5">
                <p className="heading-display text-lg text-foreground">{thread.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Athlete Mannies · {thread.status === "closed" ? "Conversation closed" : "Usually replies here"}
                </p>
              </div>
              {(support.access === "nanny" ? thread.nanny_unread : thread.family_unread) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mr-3 mt-3"
                  onClick={async () => {
                    await readFn({ data: { slug, threadId: thread.id } });
                    await refresh();
                  }}
                >
                  New reply
                </Button>
              )}
            </div>
            <div className="mt-4 space-y-3 bg-muted/40 px-4 py-5 sm:px-5">
              {thread.messages.map((message) => {
                const mine = message.sender === support.access;
                const sender = message.sender === "admin"
                  ? "Athlete Mannies"
                  : message.sender === "nanny"
                    ? "Nanny"
                    : "Family";
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-card text-foreground"}`}>
                      <p className={`text-[11px] font-semibold ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{sender}</p>
                      <p className="mt-0.5 whitespace-pre-line">{message.body}</p>
                      <p className={`mt-1 text-right text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(message.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                </div>
                );
              })}
            </div>
            <div className="flex gap-2 border-t border-border p-3 sm:p-4">
              <Input
                placeholder={`Reply as ${support.access === "nanny" ? "nanny" : "family"}…`}
                value={replies[thread.id] ?? ""}
                onChange={(e) => setReplies({ ...replies, [thread.id]: e.target.value })}
              />
              <Button
                aria-label="Send reply"
                disabled={replying === thread.id || !(replies[thread.id] ?? "").trim()}
                onClick={async () => {
                  const text = replies[thread.id] ?? "";
                  if (!text.trim()) return;
                  setReplying(thread.id);
                  try {
                    await replyFn({ data: { slug, threadId: thread.id, body: text } });
                    setReplies({ ...replies, [thread.id]: "" });
                    await refresh();
                  } finally {
                    setReplying(null);
                  }
                }}
              >
                {replying === thread.id ? "Sending…" : "Send"}
              </Button>
            </div>
          </section>
        ))}
      </div>
    </HubPage>
  );
}
