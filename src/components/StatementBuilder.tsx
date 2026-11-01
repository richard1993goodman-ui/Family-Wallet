import { RATE_BASIS_LABELS, type AgreementData, type RateBasis } from "@/lib/agreement.model";
import { WorkingDaysEditor } from "@/components/AgreementBuilder";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** The short form used for the simple written statement: just the key facts. */
export function StatementBuilder({
  data,
  onChange,
}: {
  data: AgreementData;
  onChange: (data: AgreementData) => void;
}) {
  const set = (patch: Partial<AgreementData>) => onChange({ ...data, ...patch });

  const field = (label: string, node: React.ReactNode, hint?: string) => (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1.5">{node}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </label>
  );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="heading-display text-lg text-foreground">The basics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(
            "Your name (the employer)",
            <Input
              value={data.employerName}
              onChange={(e) => set({ employerName: e.target.value })}
            />,
          )}
          {field(
            "Your nanny's name",
            <Input value={data.nannyName} onChange={(e) => set({ nannyName: e.target.value })} />,
          )}
          {field(
            "Job title",
            <Input
              value={data.jobTitle}
              placeholder="After-school nanny"
              onChange={(e) => set({ jobTitle: e.target.value })}
            />,
          )}
          {field(
            "Where they will work",
            <Input
              value={data.workAddress}
              placeholder="Your home address"
              onChange={(e) => set({ workAddress: e.target.value })}
            />,
          )}
          {field(
            "Start date",
            <Input
              type="date"
              value={data.startDate}
              onChange={(e) => set({ startDate: e.target.value })}
            />,
          )}
          {field(
            "Notice period",
            <Input
              value={data.standardNotice}
              placeholder="4 weeks"
              onChange={(e) => set({ standardNotice: e.target.value })}
            />,
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="heading-display text-lg text-foreground">Days and hours</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tick the days your nanny works and set the times.
        </p>
        <div className="mt-4">
          <WorkingDaysEditor days={data.workingDays} onChange={(days) => set({ workingDays: days })} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="heading-display text-lg text-foreground">Pay</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(
            "Hourly rate (£)",
            <Input
              value={data.hourlyRate}
              placeholder="16"
              onChange={(e) => set({ hourlyRate: e.target.value })}
            />,
          )}
          {field(
            "Gross or net",
            <div className="flex gap-2">
              {(Object.keys(RATE_BASIS_LABELS) as RateBasis[]).map((basis) => (
                <button
                  key={basis}
                  type="button"
                  onClick={() => set({ rateBasis: basis })}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    data.rateBasis === basis
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {RATE_BASIS_LABELS[basis]}
                </button>
              ))}
            </div>,
          )}
          {field(
            "How often they're paid",
            <Input
              value={data.paymentFrequency}
              placeholder="Monthly"
              onChange={(e) => set({ paymentFrequency: e.target.value })}
            />,
          )}
          {field(
            "Holiday",
            <Input
              value={data.holidayAllowance}
              placeholder="Leave blank and we'll work out the statutory amount"
              onChange={(e) => set({ holidayAllowance: e.target.value })}
            />,
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="heading-display text-lg text-foreground">The statement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is the wording your nanny will read and sign. Write it yourself, or use the draft
          button above and edit it here.
        </p>
        <Textarea
          className="mt-3"
          rows={14}
          value={data.statementBody}
          placeholder="Your written statement will appear here."
          onChange={(e) => set({ statementBody: e.target.value })}
        />
      </section>
    </div>
  );
}
