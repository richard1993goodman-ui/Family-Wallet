import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { getConcierge } from "@/lib/concierge.functions";
import { calculateEmploymentCost } from "@/lib/employment-cost.model";

export const Route = createFileRoute("/costs/$slug")({ head: () => ({ meta: [
  { title: "All-In Nanny Cost Calculator — Athlete Mannies" }, { name: "description", content: "Estimate the complete cost of employing your nanny." },
  { property: "og:title", content: "All-In Nanny Cost Calculator — Athlete Mannies" }, { property: "og:description", content: "A clear employment-cost estimate for Athlete Mannies families." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
] }), component: CostsPage });

const pounds = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
function CostsPage() {
  const { slug } = Route.useParams(); const load = useServerFn(getConcierge);
  const query = useQuery({ queryKey: ["concierge", slug], queryFn: () => load({ data: { slug } }) });
  const [input, setInput] = useState({ hourlyRate: 0, hoursPerWeek: 0, workingWeeks: 52, employerNiRate: 15, pensionRate: 3, monthlyPayrollFee: 0, annualExtras: 0 });
  useEffect(() => { if (query.data?.agreement) setInput((old) => ({ ...old, hourlyRate: query.data?.agreement?.hourlyRate ?? old.hourlyRate, hoursPerWeek: query.data?.agreement?.weeklyHours ?? old.hoursPerWeek, workingWeeks: query.data?.agreement?.workingWeeks ?? old.workingWeeks })); }, [query.data?.agreement]);
  if (query.isLoading) return <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">Loading…</div>;
  if (!query.data) return <LockedNotice slug={slug} />;
  const total = calculateEmploymentCost(input); const field = (key: keyof typeof input) => (value: string) => setInput({ ...input, [key]: Number(value) });
  return <HubPage slug={slug} title="All-in employment cost" intro="See the likely full cost before you commit, with no surprise extras.">
    {query.data.agreement?.rateBasis === "net" && <div className="mb-4 rounded-lg border border-destructive/30 bg-card p-4 text-sm text-foreground">Your agreement currently records a net rate. Enter the equivalent gross rate below for a useful estimate.</div>}
    <Card><div className="grid gap-4 sm:grid-cols-2"><Field label="Gross hourly pay (£)" type="number" value={String(input.hourlyRate || "")} onChange={field("hourlyRate")} /><Field label="Hours each week" type="number" value={String(input.hoursPerWeek || "")} onChange={field("hoursPerWeek")} /><Field label="Working weeks each year" type="number" value={String(input.workingWeeks)} onChange={field("workingWeeks")} /><Field label="Employer NI estimate (%)" type="number" value={String(input.employerNiRate)} onChange={field("employerNiRate")} /><Field label="Employer pension estimate (%)" type="number" value={String(input.pensionRate)} onChange={field("pensionRate")} /><Field label="Payroll service each month (£)" type="number" value={String(input.monthlyPayrollFee || "")} onChange={field("monthlyPayrollFee")} /><Field label="Other annual employment costs (£)" type="number" value={String(input.annualExtras || "")} onChange={field("annualExtras")} /></div></Card>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><Summary label="True all-in hourly cost" value={pounds(total.allInHourly)} strong /><Summary label="Estimated monthly cost" value={pounds(total.monthlyTotal)} /><Summary label="Estimated weekly cost" value={pounds(total.weeklyTotal)} /><Summary label="Estimated annual cost" value={pounds(total.annualTotal)} /></div>
    <Card><h2 className="font-medium text-foreground">Annual breakdown</h2><dl className="mt-3 space-y-2 text-sm">{[["Gross pay", total.grossPay], ["Employer NI estimate", total.employerNi], ["Employer pension estimate", total.pension], ["Payroll service", total.payroll], ["Other costs", total.extras]].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium text-foreground">{pounds(Number(value))}</dd></div>)}</dl></Card>
    <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Planning estimate only. NI thresholds, pension eligibility, holiday pay and individual circumstances can change the final figure. Confirm your figures with Nannytax or HMRC.</p>
  </HubPage>;
}
function Summary({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <Card><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className={`${strong ? "text-primary" : "text-foreground"} heading-display mt-2 text-2xl`}>{value}</p></Card>; }