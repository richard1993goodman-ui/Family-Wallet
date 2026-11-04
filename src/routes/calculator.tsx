import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateNannyCost, type CostInput } from "@/lib/nanny-cost.model";

const TITLE = "Nanny Cost Calculator — The Family Wallet";
const DESC = "Work out the true monthly cost of a nanny in London: take-home or gross pay, employer NI, pension and payroll.";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalculatorPage,
});

const gbp = (v: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);
const gbp2 = (v: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);


function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CalculatorPage() {
  const [input, setInput] = useState<CostInput>({ rate: 15, basis: "net", hoursPerDay: 3.5, daysPerWeek: 3, pattern: "term-time", termWeeks: 38, includeMembership: false, payrollMonthly: 0 });
  const set = <K extends keyof CostInput>(k: K, v: CostInput[K]) => setInput((o) => ({ ...o, [k]: v }));
  const num = (k: keyof CostInput) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never);
  const r = calculateNannyCost(input);

  const summary = [
    "The Family Wallet — nanny cost estimate",
    `${r.days} day${r.days > 1 ? "s" : ""} × ${input.hoursPerDay} hrs (${r.weeklyHours} hrs/week), ${input.pattern === "term-time" ? `term-time, ${r.weeks} weeks` : "year-round"}`,
    `£${input.rate}/hr ${input.basis}`,
    `Nanny take-home: ${gbp(r.netPay)}/yr · Gross: ${gbp(r.grossPay)}/yr`,
    `Employer NI: ${gbp(r.employerNi)} · Pension: ${gbp(r.employerPension)}`,
    input.includeMembership ? `${r.tier.name} membership: £${r.tier.monthly} + VAT/month` : "",
    `Estimated all-in: ${gbp(r.monthlyTotal)}/month (${gbp2(r.allInHourly)}/hr)`,
  ].filter(Boolean).join("\n");


  const rows: [string, number][] = [
    ["Nanny take-home pay", r.netPay],
    ["Income tax (via payroll)", r.incomeTax],
    ["Nanny's NI (via payroll)", r.employeeNi],
    ["Nanny's pension (via payroll)", r.employeePension],
    ["Gross pay", r.grossPay],
    ["Employer NI", r.employerNi],
    ["Employer pension (3%)", r.employerPension],
    ...(input.includeMembership ? [[`${r.tier.name} membership inc. VAT`, r.membership] as [string, number]] : []),
    ...(r.payroll ? [["Payroll service", r.payroll] as [string, number]] : []),
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary"><ArrowLeft className="h-4 w-4" /> Home</Link>
        <p className="mt-6 text-[0.8125rem] font-medium text-primary">Plan your budget</p>
        <h1 className="heading-display mt-2 text-3xl text-foreground sm:text-4xl">What will a nanny really cost?</h1>
        <p className="mt-3 text-muted-foreground">Enter the rate you've discussed — take-home or gross — and see your full monthly outlay, including tax and pension.</p>

        <section className="mt-8 grid gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2 space-y-2">
            <Label>Hourly rate is…</Label>
            <Segmented value={input.basis} onChange={(v) => set("basis", v)} options={[{ value: "net", label: "Take-home (net)" }, { value: "gross", label: "Gross" }]} />
          </div>
          <div className="space-y-2"><Label htmlFor="rate">Hourly rate (£)</Label><Input id="rate" type="number" step="0.5" min="0" value={input.rate || ""} onChange={num("rate")} /></div>
          <div className="space-y-2"><Label htmlFor="hours">Hours per day</Label><Input id="hours" type="number" step="0.5" min="0" value={input.hoursPerDay || ""} onChange={num("hoursPerDay")} /></div>
          <div className="space-y-2"><Label htmlFor="days">Days per week</Label><Input id="days" type="number" min="1" max="7" value={input.daysPerWeek || ""} onChange={num("daysPerWeek")} /></div>
          <div className="space-y-2">
            <Label>Working pattern</Label>
            <Segmented value={input.pattern} onChange={(v) => set("pattern", v)} options={[{ value: "term-time", label: "Term-time" }, { value: "year-round", label: "Year-round" }]} />
          </div>
          {input.pattern === "term-time" && (
            <div className="space-y-2"><Label htmlFor="weeks">Weeks worked per year</Label><Input id="weeks" type="number" min="1" max="52" value={input.termWeeks || ""} onChange={num("termWeeks")} /></div>
          )}
          <div className="space-y-2"><Label htmlFor="payroll">Payroll service per month (£, optional)</Label><Input id="payroll" type="number" min="0" value={input.payrollMonthly || ""} onChange={num("payrollMonthly")} /></div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          {[["Per month", gbp(r.monthlyTotal), true], ["Per week (avg)", gbp(r.weeklyTotal), false], ["All-in per hour", gbp2(r.allInHourly), false]].map(([l, v, s]) => (
            <div key={String(l)} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-[0.8125rem] font-medium text-muted-foreground">{l}</p>
              <p className={`heading-display mt-2 text-3xl ${s ? "text-primary" : "text-foreground"}`}>{v}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="font-medium text-foreground">Yearly breakdown</h2>
          {input.basis === "net" && <p className="mt-1 text-sm text-muted-foreground">£{input.rate}/hr take-home ≈ {gbp2(r.grossHourly)}/hr gross.</p>}
          {input.pattern === "term-time" && <p className="mt-1 text-sm text-muted-foreground">Includes 12.07% rolled-up holiday pay for term-time work.</p>}
          <dl className="mt-4 divide-y divide-border text-sm">
            {rows.map(([l, v]) => (<div key={l} className="flex justify-between gap-4 py-2"><dt className="text-muted-foreground">{l}</dt><dd className="font-medium text-foreground">{gbp(v)}</dd></div>))}
            <div className="flex justify-between gap-4 pt-3 text-base"><dt className="font-semibold text-foreground">Total yearly cost to you</dt><dd className="font-semibold text-primary">{gbp(r.annualTotal)}</dd></div>
          </dl>
        </section>

        <div className="mt-5">
          <Button size="lg" variant="outline" className="w-full" onClick={async () => { await navigator.clipboard.writeText(summary); toast.success("Summary copied — paste it into your notes or chat"); }}><Copy className="h-4 w-4" /> Copy summary</Button>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Planning estimate using 2026/27 UK rates for a single job with a standard tax code. Pension assumes auto-enrolment at 3% employer / 5% employee when pay is over £10,000. Your nanny is employed by your household, and payroll is run by a specialist provider — we recommend Nannytax. Confirm final figures with your payroll provider.
        </p>

      </div>
    </main>
  );
}
