import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, ExternalLink, ShieldAlert } from "lucide-react";
import { Card, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { getSafety, getSafetyDocumentUrl } from "@/lib/concierge.functions";
import { SAFETY_DOCUMENTS } from "@/lib/concierge.types";

export const Route = createFileRoute("/safety/$slug")({ head: () => ({ meta: [
  { title: "Insurance & Safeguarding — Athlete Mannies" }, { name: "description", content: "Private nanny insurance, identity and safeguarding records." },
  { property: "og:title", content: "Insurance & Safeguarding — Athlete Mannies" }, { property: "og:description", content: "See the safety and insurance records held for your nanny." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
] }), component: SafetyPage });

function SafetyPage() {
  const { slug } = Route.useParams(); const load = useServerFn(getSafety); const open = useServerFn(getSafetyDocumentUrl);
  const query = useQuery({ queryKey: ["safety", slug], queryFn: () => load({ data: { slug } }) });
  if (query.isLoading) return <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">Loading…</div>;
  if (!query.data) return <LockedNotice slug={slug} />;
  return <HubPage slug={slug} title="Insurance & safeguarding" intro="A clear record of the checks, training and cover held for each nanny.">
    <div className="space-y-5">{query.data.nannies.length === 0 && <Card><p className="text-sm text-muted-foreground">No nanny records have been added yet.</p></Card>}{query.data.nannies.map((nanny) => { const coverEnd = nanny.insurance_cover_until ? new Date(`${nanny.insurance_cover_until}T23:59:59Z`) : null; const coverActive = Boolean(nanny.insurance_provider && coverEnd && coverEnd >= new Date()); return <Card key={nanny.id}><div className="flex items-start justify-between gap-4"><div><h2 className="heading-display text-xl text-foreground">{nanny.name}</h2><p className={`mt-1 text-sm font-medium ${coverActive ? "text-primary" : "text-destructive"}`}>{coverActive ? "Public liability cover recorded" : "Public liability cover not currently verified"}</p></div>{coverActive ? <BadgeCheck className="h-6 w-6 text-primary" /> : <ShieldAlert className="h-6 w-6 text-destructive" />}</div>
      {nanny.insurance_provider && <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Provider</dt><dd className="font-medium text-foreground">{nanny.insurance_provider}</dd></div><div><dt className="text-muted-foreground">Policy/reference</dt><dd className="font-medium text-foreground">{nanny.insurance_policy_number ?? "Not recorded"}</dd></div><div><dt className="text-muted-foreground">Cover from</dt><dd className="font-medium text-foreground">{nanny.insurance_cover_from ?? "Not recorded"}</dd></div><div><dt className="text-muted-foreground">Cover until</dt><dd className="font-medium text-foreground">{nanny.insurance_cover_until ?? "Not recorded"}</dd></div></dl>}
      <div className="mt-5 divide-y divide-border border-y border-border">{SAFETY_DOCUMENTS.map(([key, label]) => { const doc = nanny.documents.find((item) => item.document_type === key); const expired = Boolean(doc?.expires_on && new Date(`${doc.expires_on}T23:59:59Z`) < new Date()); return <div key={key} className="flex items-center justify-between gap-3 py-3 text-sm"><span><span className="font-medium text-foreground">{label}</span><span className={`ml-2 ${expired ? "text-destructive" : "text-muted-foreground"}`}>{!doc ? "Not recorded" : expired ? "Expired" : "Verified"}</span></span>{doc?.visibility === "document" && <Button size="sm" variant="ghost" onClick={async () => { const { url } = await open({ data: { slug, id: doc.id } }); if (url) window.open(url, "_blank", "noopener"); }}>View <ExternalLink className="h-3.5 w-3.5" /></Button>}</div>; })}</div>
    </Card>; })}</div>
    <p className="mt-5 text-xs leading-relaxed text-muted-foreground">This page reports records held in the vault. “Not recorded” does not confirm that a check or policy does not exist; contact Athlete Mannies if anything needs updating.</p>
  </HubPage>;
}