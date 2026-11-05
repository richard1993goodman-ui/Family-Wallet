import { requireTwoStepClient } from "@/lib/two-step";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { listSupportThreads, replyToThread, setThreadStatus } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/support")({
  beforeLoad: () => requireTwoStepClient(),
  head: () => ({
    meta: [
      { title: "Support inbox — The Family Wallet admin" },
      { name: "description", content: "Questions from your families, newest first." },
      { property: "og:title", content: "Support inbox — The Family Wallet admin" },
      { property: "og:description", content: "Answer family questions from one place." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupportInbox,
});

function SupportInbox() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listSupportThreads);
  const replyFn = useServerFn(replyToThread);
  const statusFn = useServerFn(setThreadStatus);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const query = useQuery({ queryKey: ["admin-support"], queryFn: () => listFn() });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin-support"] });
  }

  const threads = query.data ?? [];

  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to families
        </Link>
        <h1 className="heading-display mt-4 text-3xl text-primary">Support inbox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {threads.filter((t) => t.needsReply).length} waiting for a reply
        </p>

        <div className="mt-6 space-y-3">
          {query.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!query.isLoading && threads.length === 0 && (
            <p className="text-sm text-muted-foreground">No questions yet.</p>
          )}
          {threads.map((thread) => (
            <div key={thread.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="heading-display text-lg text-foreground">{thread.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {thread.familyName} ·{" "}
                    {new Date(thread.updated_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                {thread.needsReply ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                    Needs reply
                  </span>
                ) : (
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs text-foreground">
                    {thread.status === "closed" ? "Closed" : "Answered"}
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {thread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-lg p-3 text-sm ${
                      message.sender === "admin" ? "bg-accent/60" : "bg-muted"
                    }`}
                  >
                    <p className="text-[0.8125rem] font-medium text-muted-foreground">
                      {message.sender === "admin"
                        ? "You"
                        : message.sender === "nanny"
                          ? `${thread.familyName} nanny`
                          : thread.familyName}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-foreground">{message.body}</p>
                  </div>
                ))}
              </div>

              <Textarea
                className="mt-3"
                rows={3}
                placeholder="Write your reply…"
                value={drafts[thread.id] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [thread.id]: e.target.value })}
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  onClick={async () => {
                    const body = drafts[thread.id] ?? "";
                    if (!body.trim()) return;
                    await replyFn({ data: { threadId: thread.id, body } });
                    setDrafts({ ...drafts, [thread.id]: "" });
                    toast.success("Reply sent");
                    await refresh();
                  }}
                >
                  Send reply
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await statusFn({
                      data: {
                        threadId: thread.id,
                        status: thread.status === "closed" ? "open" : "closed",
                      },
                    });
                    await refresh();
                  }}
                >
                  {thread.status === "closed" ? "Reopen" : "Mark as closed"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
