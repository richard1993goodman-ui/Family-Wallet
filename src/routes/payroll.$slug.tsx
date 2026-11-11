import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { getConcierge, requestConciergeFn } from "@/lib/concierge.functions";

export const Route = createFileRoute("/payroll/$slug")({ head: () => ({ meta: [
  { title: "Payroll setup — Family Wallet" }, { name: "description", content: "Get set up with payroll through our partner Nannytax, with a unique referral code." },
  { property: "og:title", content: "Payroll setup — Family Wallet" }, { property: "og:description", content: "Contact support and we'll connect you with Nannytax for payroll." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
] }), component: PayrollPage });

function PayrollPage() {
  const { slug } = Route.useParams(); const client = useQueryClient();
  const load = useServerFn(getConcierge); const request = useServerFn(requestConciergeFn);
  const query = useQuery({ queryKey: ["concierge", slug], queryFn: () => load({ data: { slug } }) });
  const [sending, setSending] = useState(false);
  if (query.isLoading) return <PageLoading />;
  if (!query.data) return <LockedNotice slug={slug} />;
  const code = query.data.nannytaxCode;
  const requested = query.data.service.payroll_status !== "not_started";
  const ask = async () => {
    setSending(true);
    try {
      await request({ data: { slug, kind: "payroll", message: "Please connect us with Nannytax and send our referral code." } });
      await client.invalidateQueries({ queryKey: ["concierge", slug] });
      toast.success("Sent to support. We'll email your referral code.");
    } catch { toast.error("Couldn't send. Please try again."); } finally { setSending(false); }
  };
  return <HubPage slug={slug} title="Payroll setup" intro="Family Wallet keeps your agreement, hours and records. For payroll, payslips and HMRC, we connect you with our partners at Nannytax.">
    {code ? (
      <Card>
        <h2 className="font-medium text-foreground">Your Nannytax referral code</h2>
        <p className="mt-2 text-sm text-muted-foreground">Use this code when you sign up with Nannytax.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-accent px-3 py-1.5 font-mono text-lg font-semibold tracking-wide text-foreground">{code}</span>
          <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(code); toast.success("Code copied"); }}><Copy className="h-4 w-4" /> Copy</Button>
          <a href="https://www.nannytax.co.uk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-4">Go to Nannytax <ExternalLink className="h-4 w-4" /></a>
        </div>
      </Card>
    ) : (
      <Card>
        <h2 className="font-medium text-foreground">Get set up with payroll</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Contact support below.</li>
          <li>We connect you with Nannytax and send your unique referral code.</li>
          <li>Your code appears here, ready to use when you sign up.</li>
        </ol>
        <Button className="mt-4" disabled={sending || requested} onClick={ask}>{requested ? "Request sent, we'll be in touch" : sending ? "Sending…" : "Contact support"}</Button>
      </Card>
    )}
    <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Nannytax is an independent payroll provider. Family Wallet does not run payroll or file tax returns.</p>
  </HubPage>;
}
