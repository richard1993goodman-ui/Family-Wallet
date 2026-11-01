import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Plus, Send } from "lucide-react";
import { toast } from "sonner";

import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { getMessages, markThreadReadFn, replyThreadFn, startThreadFn } from "@/lib/messages.functions";
import { MESSAGE_TOPICS } from "@/lib/messages.types";

export const Route = createFileRoute("/messages/$slug")({
  head: () => ({
    meta: [
      { title: "Messages — The Family Wallet" },
      { name: "description", content: "Private conversations between parents and your nanny, organised by topic." },
      { property: "og:title", content: "Messages — The Family Wallet" },
      { property: "og:description", content: "Chat about specific things — children, school, meals, pay — in one private place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MessagesPage,
});

const topicLabel = (id: string) => MESSAGE_TOPICS.find((t) => t.id === id)?.label ?? "General";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function MessagesPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const loadFn = useServerFn(getMessages);
  const startFn = useServerFn(startThreadFn);
  const replyFn = useServerFn(replyThreadFn);
  const readFn = useServerFn(markThreadReadFn);
  const query = useQuery({ queryKey: ["household-messages", slug], queryFn: () => loadFn({ data: { slug } }), refetchInterval: 15000 });

  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [topic, setTopic] = useState("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  if (query.isLoading) return <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">Loading…</div>;
  if (!query.data) return <LockedNotice slug={slug} />;
  const data = query.data;
  const refresh = () => client.invalidateQueries({ queryKey: ["household-messages", slug] });
  const open = data.threads.find((t) => t.id === openId) ?? null;
  const shown = data.threads.filter((t) => filter === "all" || t.topic === filter);

  const openThread = async (id: string) => {
    setOpenId(id);
    setReply("");
    await readFn({ data: { slug, threadId: id } });
    refresh();
  };

  if (open) {
    return (
      <HubPage slug={slug} title={open.title} intro={topicLabel(open.topic)}>
        <button className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary" onClick={() => setOpenId(null)}>
          <ArrowLeft className="h-4 w-4" /> All conversations
        </button>
        <div className="space-y-3">
          {open.messages.map((m) => {
            const mine = m.sender === data.access;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${mine ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>
                  <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  <p className={`mt-1 text-[11px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {m.senderName ?? (m.sender === "family" ? "Parent" : "Nanny")} · {when(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex items-end gap-2">
          <textarea
            className="min-h-[44px] flex-1 rounded-2xl border border-input bg-card px-4 py-2.5 text-sm"
            placeholder="Write a reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <Button
            size="icon"
            aria-label="Send"
            disabled={busy || !reply.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await replyFn({ data: { slug, threadId: open.id, body: reply } });
                setReply("");
                await refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't send");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </HubPage>
    );
  }

  return (
    <HubPage slug={slug} title="Messages" intro="Private conversations between parents and your nanny — one thread per topic, so nothing gets lost in a busy group chat.">
      {composing ? (
        <Card>
          <h2 className="font-semibold text-foreground">New conversation</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {MESSAGE_TOPICS.map((t) => (
              <Button key={t.id} size="sm" variant={topic === t.id ? "default" : "outline"} onClick={() => setTopic(t.id)}>{t.label}</Button>
            ))}
          </div>
          <div className="mt-3 grid gap-3">
            <Field label="Subject" value={title} onChange={setTitle} placeholder="Oliver's swimming kit" />
            <Field label="Message" textarea value={body} onChange={setBody} placeholder="What would you like to talk about?" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await startFn({ data: { slug, topic, title, body } });
                  setTitle("");
                  setBody("");
                  setComposing(false);
                  await refresh();
                  setOpenId(res.id);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Couldn't start");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Start conversation
            </Button>
            <Button variant="outline" onClick={() => setComposing(false)}>Cancel</Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setComposing(true)}><Plus className="mr-1 h-4 w-4" /> New conversation</Button>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {[{ id: "all", label: "All" }, ...MESSAGE_TOPICS].map((t) => (
          <Button key={t.id} size="sm" variant={filter === t.id ? "secondary" : "ghost"} onClick={() => setFilter(t.id)}>{t.label}</Button>
        ))}
      </div>

      <div className="ios-group mt-3">
        {shown.length === 0 && <p className="p-5 text-sm text-muted-foreground">No conversations yet.</p>}
        {shown.map((t) => {
          const last = t.messages[t.messages.length - 1];
          return (
            <button key={t.id} className="ios-row w-full text-left" onClick={() => openThread(t.id)}>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`truncate font-medium text-foreground ${t.unread ? "font-semibold" : ""}`}>{t.title}</span>
                  {t.unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {topicLabel(t.topic)} · {last ? last.body : ""}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">{when(t.updatedAt)}</span>
            </button>
          );
        })}
      </div>
    </HubPage>
  );
}
