import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { Card, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { getConcierge, requestConciergeFn } from "@/lib/concierge.functions";
import { CURATION_STATUSES, statusLabel } from "@/lib/concierge.types";

export const Route = createFileRoute("/curation/$slug")({ head: () => ({ meta: [
  { title: "Private Nanny Curation — The Family Wallet" }, { name: "description", content: "Your private, hand-selected nanny search with your agency." },
  { property: "og:title", content: "Private Nanny Curation — The Family Wallet" }, { property: "og:description", content: "A discreet, hand-selected nanny search without a public catalogue." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
] }), component: CurationPage });

function CurationPage() {
  const { slug } = Route.useParams(); const client = useQueryClient(); const load = useServerFn(getConcierge); const request = useServerFn(requestConciergeFn);
  const query = useQuery({ queryKey: ["concierge", slug], queryFn: () => load({ data: { slug } }) });
  if (query.isLoading) return <PageLoading />;
  if (!query.data) return <LockedNotice slug={slug} />;
  const current = query.data.service.curation_status; const currentIndex = CURATION_STATUSES.findIndex(([key]) => key === current);
  return <HubPage slug={slug} title="Private nanny curation" intro="No public catalogue and no profile overload — we quietly hand-select the strongest matches for your family.">
    <Card><p className="text-[0.8125rem] font-medium text-muted-foreground">Your search</p><p className="heading-display mt-1 text-xl text-foreground">{statusLabel(CURATION_STATUSES, current)}</p>
      <ol className="mt-5 space-y-3">{CURATION_STATUSES.slice(1, 6).map(([key, label]) => { const index = CURATION_STATUSES.findIndex(([value]) => value === key); const done = current === "placement_made" || (currentIndex >= index && current !== "paused"); return <li key={key} className="flex gap-3 text-sm">{done ? <Check className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}<span className={done ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span></li>; })}</ol>
      {query.data.service.curation_notes && <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-foreground">{query.data.service.curation_notes}</p>}
    </Card>
    <div className="mt-4 grid gap-3 sm:grid-cols-3"><Card><p className="font-medium text-foreground">1. Family brief</p><p className="mt-2 text-sm text-muted-foreground">We learn the routine, personalities, values and practical needs.</p></Card><Card><p className="font-medium text-foreground">2. Personal search</p><p className="mt-2 text-sm text-muted-foreground">We screen our network and speak directly with suitable candidates.</p></Card><Card><p className="font-medium text-foreground">3. Private shortlist</p><p className="mt-2 text-sm text-muted-foreground">You receive only carefully selected profiles through your private channel.</p></Card></div>
    <Button className="mt-5" disabled={["brief_received", "search_underway", "shortlist_sent", "interviews"].includes(current)} onClick={async () => { await request({ data: { slug, kind: "curation", message: "Please contact us about starting a private nanny search for our family." } }); await client.invalidateQueries({ queryKey: ["concierge", slug] }); toast.success("Private search request sent"); }}>Request a private search</Button>
  </HubPage>;
}