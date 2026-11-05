import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BookOpen, ExternalLink, Sparkles } from "lucide-react";

import { Card, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { getPlaybooks, markPlaybookRead } from "@/lib/premium-content.functions";

export const Route = createFileRoute("/playbooks/$slug")({
  head: () => ({ meta: [
    { title: "Agency Materials — The Family Wallet" },
    { name: "description", content: "Audiobooks, digital books, activity guides and seasonal packs for your family." },
    { property: "og:title", content: "Agency Materials — The Family Wallet" },
    { property: "og:description", content: "Audiobooks, digital books, guides and seasonal packs for families and nannies." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: PlaybooksPage,
});

function PlaybooksPage() {
  const { slug } = Route.useParams();
  const fetchPlaybooks = useServerFn(getPlaybooks);
  const markRead = useServerFn(markPlaybookRead);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["playbooks", slug], queryFn: () => fetchPlaybooks({ data: { slug } }) });
  const [openId, setOpenId] = useState<string | null>(null);
  if (isLoading) return <HubPage slug={slug} title="Agency Materials"><p className="text-sm text-muted-foreground">Loading the latest edit…</p></HubPage>;
  if (!data) return <HubPage slug={slug} title="Agency Materials"><LockedNotice slug={slug} /></HubPage>;
  const open = async (id: string) => {
    setOpenId((current) => current === id ? null : id);
    const item = data.playbooks.find((playbook) => playbook.id === id);
    if (!item?.readAt) { await markRead({ data: { slug, playbookId: id } }); await qc.invalidateQueries({ queryKey: ["playbooks", slug] }); }
  };
  return (
    <HubPage slug={slug} title="Agency Materials" intro="Audiobooks, digital books, activity guides and seasonal packs — prepared for your family and delivered to your wallet.">
      <div className="space-y-4">
        {data.playbooks.length === 0 && <Card><p className="text-sm text-muted-foreground">Your first material is being prepared.</p></Card>}
        {data.playbooks.map((playbook, index) => {
          const expanded = openId === playbook.id;
          return <article key={playbook.id} className={`overflow-hidden rounded-xl border bg-card ${playbook.is_featured && index === 0 ? "border-primary/50" : "border-border"}`}>
            {playbook.cover_image_url && <img src={playbook.cover_image_url} alt="" className="aspect-[16/7] w-full object-cover" />}
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.8125rem] font-medium text-primary">{playbook.season} · {playbook.topic}</p>
                  <h2 className="heading-display mt-1 text-xl text-foreground">{playbook.title}</h2>
                </div>
                {!playbook.readAt ? <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">New</span> : playbook.is_featured ? <Sparkles className="h-5 w-5 text-primary" /> : <BookOpen className="h-5 w-5 text-primary" />}
              </div>
              {playbook.introduction && <p className="mt-3 text-sm text-muted-foreground">{playbook.introduction}</p>}
              {playbook.age_guidance && <p className="mt-2 text-xs font-medium text-muted-foreground">Best for: {playbook.age_guidance}</p>}
              <Button className="mt-4" variant={expanded ? "outline" : "default"} onClick={() => void open(playbook.id)}>{expanded ? "Close material" : "Open material"}</Button>
              {expanded && <div className="mt-5 space-y-5 border-t border-border pt-5">
                {playbook.sections.map((section) => <section key={section.heading}><h3 className="heading-display text-lg text-foreground">{section.heading}</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{section.body}</p></section>)}
                {playbook.resource_url && <Button asChild variant="outline"><a href={playbook.resource_url} target="_blank" rel="noopener noreferrer">Open extra resource <ExternalLink className="h-4 w-4" /></a></Button>}
              </div>}
            </div>
          </article>;
        })}
      </div>
    </HubPage>
  );
}