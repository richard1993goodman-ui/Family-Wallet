import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Circle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { getConcierge, requestConciergeFn } from "@/lib/concierge.functions";
import { PAYROLL_STATUSES, statusLabel } from "@/lib/concierge.types";

export const Route = createFileRoute("/payroll/$slug")({ head: () => ({ meta: [
  { title: "Managed Payroll Setup — The Family Wallet" }, { name: "description", content: "Track your private Nannytax payroll setup with your agency." },
  { property: "og:title", content: "Managed Payroll Setup — The Family Wallet" }, { property: "og:description", content: "Guided nanny payroll onboarding for your agency families." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
] }), component: PayrollPage });

function PayrollPage() {
  const { slug } = Route.useParams(); const client = useQueryClient();
  const load = useServerFn(getConcierge); const request = useServerFn(requestConciergeFn);
  const query = useQuery({ queryKey: ["concierge", slug], queryFn: () => load({ data: { slug } }) });
  if (query.isLoading) return <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">Loading…</div>;
  if (!query.data) return <LockedNotice slug={slug} />;
  const current = query.data.service.payroll_status;
  const stages = PAYROLL_STATUSES.slice(1);
  const currentIndex = stages.findIndex(([key]) => key === current);
  return <HubPage slug={slug} title="Managed payroll setup" intro="We coordinate your Nannytax introduction and keep every next step visible here.">
    <Card><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current status</p><p className="heading-display mt-1 text-xl text-foreground">{statusLabel(PAYROLL_STATUSES, current)}</p></div><span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground">Concierge</span></div>
      <ol className="mt-5 space-y-3">{stages.map(([key, label], index) => { const done = current === "payroll_ready" || (currentIndex >= 0 && index <= currentIndex); return <li key={key} className="flex gap-3 text-sm">{done ? <Check className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}<span className={done ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span></li>; })}</ol>
      {query.data.service.payroll_start_date && <p className="mt-4 text-sm text-muted-foreground">Payroll start date: {new Date(`${query.data.service.payroll_start_date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</p>}
      {query.data.service.payroll_notes && <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-foreground">{query.data.service.payroll_notes}</p>}
    </Card>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><Card><h2 className="font-medium text-foreground">Ask us to arrange it</h2><p className="mt-2 text-sm text-muted-foreground">We’ll contact you, coordinate the introduction and help keep setup moving.</p><Button className="mt-4" disabled={current === "introduction_requested" || current === "setup_in_progress" || current === "payroll_ready"} onClick={async () => { await request({ data: { slug, kind: "payroll", message: "Please help us arrange our Nannytax payroll setup." } }); await client.invalidateQueries({ queryKey: ["concierge", slug] }); toast.success("Request sent to your agency"); }}>Request managed setup</Button></Card>
      <Card><h2 className="font-medium text-foreground">Your referral code</h2><p className="mt-2 font-mono text-lg font-semibold text-foreground">{query.data.nannytaxCode ?? "Not added yet"}</p><a href="https://www.nannytax.co.uk" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Visit Nannytax <ExternalLink className="h-4 w-4" /></a></Card></div>
    <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Nannytax is an independent provider. Your agency coordinates your introduction but does not file payroll or tax returns.</p>
  </HubPage>;
}