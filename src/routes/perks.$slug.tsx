import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, ExternalLink, Gift, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Card, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { getPerks } from "@/lib/premium-content.functions";

export const Route = createFileRoute("/perks/$slug")({
  head: () => ({ meta: [
    { title: "Family perks — The Family Wallet" },
    { name: "description", content: "Private London partner offers and family concierge recommendations for your family." },
    { property: "og:title", content: "Family perks — The Family Wallet" },
    { property: "og:description", content: "Private London partner offers and family concierge recommendations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: PerksPage,
});

function PerksPage() {
  const { slug } = Route.useParams();
  const fetchPerks = useServerFn(getPerks);
  const { data, isLoading } = useQuery({ queryKey: ["partner-perks", slug], queryFn: () => fetchPerks({ data: { slug } }) });
  const [category, setCategory] = useState("All");
  if (isLoading) return <HubPage slug={slug} title="Family perks"><p className="text-sm text-muted-foreground">Loading your offers…</p></HubPage>;
  if (!data) return <HubPage slug={slug} title="Family perks"><LockedNotice slug={slug} /></HubPage>;
  const categories = ["All", ...Array.from(new Set(data.perks.map((perk) => perk.category)))];
  const shown = data.perks.filter((perk) => category === "All" || perk.category === category);
  return (
    <HubPage slug={slug} title="Family perks & London Concierge" intro="A private edit of trusted London partners, priority access and member-only offers selected for busy families.">
      <div className="mb-5 flex flex-wrap gap-2">
        {categories.map((item) => <Button key={item} size="sm" variant={category === item ? "default" : "outline"} onClick={() => setCategory(item)}>{item}</Button>)}
      </div>
      <div className="space-y-4">
        {shown.length === 0 && <Card><p className="text-sm text-muted-foreground">Fresh member perks are being curated. Please check back soon.</p></Card>}
        {shown.map((perk) => (
          <Card key={perk.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.8125rem] font-medium text-primary">{perk.category}</p>
                <h2 className="heading-display mt-1 text-xl text-foreground">{perk.title}</h2>
                <p className="mt-1 font-medium text-muted-foreground">{perk.partner_name}</p>
              </div>
              <Gift className="h-6 w-6 shrink-0 text-primary" />
            </div>
            <p className="mt-4 rounded-lg bg-accent/35 p-3 font-medium text-foreground">{perk.offer_text}</p>
            {perk.description && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{perk.description}</p>}
            {perk.area && <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{perk.area}</p>}
            {perk.offer_code && <div className="mt-4 flex flex-wrap items-center gap-2"><code className="rounded-md bg-muted px-3 py-2 font-semibold text-foreground">{perk.offer_code}</code><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(perk.offer_code ?? ""); toast.success("Member code copied"); }}><Copy className="h-4 w-4" /> Copy</Button></div>}
            {perk.redemption_instructions && <p className="mt-3 text-sm"><span className="font-medium text-foreground">How to claim: </span><span className="text-muted-foreground">{perk.redemption_instructions}</span></p>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {perk.website_url && <Button asChild><a href={perk.website_url} target="_blank" rel="noopener noreferrer">Visit partner <ExternalLink className="h-4 w-4" /></a></Button>}
              {perk.contact_text && <span className="text-sm text-muted-foreground">{perk.contact_text}</span>}
              {perk.expires_on && <span className="text-xs text-muted-foreground">Valid until {new Date(`${perk.expires_on}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</span>}
            </div>
          </Card>
        ))}
      </div>
    </HubPage>
  );
}