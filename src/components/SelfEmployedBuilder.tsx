import { AlertTriangle } from "lucide-react";

import type { AgreementData } from "@/lib/agreement.model";
import { WorkingDaysEditor } from "@/components/AgreementBuilder";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const box = "rounded-2xl bg-card p-5 shadow-sm";

/** The short form for the self-employed services agreement. */
export function SelfEmployedBuilder({
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
      <section className="rounded-2xl bg-warning-soft p-5 text-warning">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">Check this is right for you first</p>
            <p className="mt-1">
              Most nannies who work in one family's home, at set times, are employees, not self-employed. It is only
              self-employment if that is how it really works: your nanny has other clients, sets how they work, can send a
              substitute, carries their own insurance and invoices you. Calling someone self-employed does not make them so, and
              getting it wrong can mean back-dated tax. If you are unsure, use the employed agreement, or{" "}
              <a
                className="underline underline-offset-4"
                href="https://www.gov.uk/check-employment-status-for-tax"
                target="_blank"
                rel="noopener noreferrer"
              >
                check employment status with HMRC
              </a>
              . This is general information, not legal or tax advice.
            </p>
          </div>
        </div>
      </section>

      <section className={box}>
        <h2 className="heading-display text-lg text-foreground">The basics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field("Your name (the client)", <Input value={data.employerName} onChange={(e) => set({ employerName: e.target.value })} />)}
          {field("Your nanny's name", <Input value={data.nannyName} onChange={(e) => set({ nannyName: e.target.value })} />)}
          {field("Where they will work", <Input value={data.workAddress} placeholder="Your home address" onChange={(e) => set({ workAddress: e.target.value })} />)}
          {field("Start date", <Input type="date" value={data.startDate} onChange={(e) => set({ startDate: e.target.value })} />)}
          {field(
            "End date",
            <Input type="date" value={data.endDate} onChange={(e) => set({ endDate: e.target.value, isFixedTerm: Boolean(e.target.value) })} />,
            "Leave blank if it continues until one of you ends it.",
          )}
          {field("Notice to end the agreement", <Input value={data.standardNotice} placeholder="2 weeks" onChange={(e) => set({ standardNotice: e.target.value })} />)}
        </div>
        <div className="mt-4">
          {field(
            "What your nanny will do",
            <Textarea
              rows={3}
              value={data.servicesDescription}
              placeholder="School pick-ups, after-school care, tea and homework for two children aged 8 and 5."
              onChange={(e) => set({ servicesDescription: e.target.value })}
            />,
          )}
        </div>
      </section>

      <section className={box}>
        <h2 className="heading-display text-lg text-foreground">Booked sessions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These fill in your family calendar. You can split a day into two shifts, and change them later under Working hours.
        </p>
        <div className="mt-4">
          <WorkingDaysEditor days={data.workingDays} onChange={(days) => set({ workingDays: days })} />
        </div>
      </section>

      <section className={box}>
        <h2 className="heading-display text-lg text-foreground">Fees and invoices</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field("Hourly fee (£)", <Input value={data.hourlyRate} placeholder="18" onChange={(e) => set({ hourlyRate: e.target.value })} />)}
          {field("Invoiced", <Input value={data.paymentFrequency} placeholder="Monthly" onChange={(e) => set({ paymentFrequency: e.target.value })} />)}
          {field("Paid within (days)", <Input value={data.invoiceDays} placeholder="14" onChange={(e) => set({ invoiceDays: e.target.value })} />)}
          {field("Paid by", <Input value={data.paymentMethod} placeholder="bank transfer" onChange={(e) => set({ paymentMethod: e.target.value })} />)}
          {field("Expenses", <Input value={data.expenseRate} placeholder="45p a mile, receipts for everything else" onChange={(e) => set({ expenseRate: e.target.value })} />)}
        </div>
      </section>

      <section className={box}>
        <h2 className="heading-display text-lg text-foreground">Cancellations, substitutes and insurance</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(
            "Notice to cancel a session for free",
            <Input value={data.cancellationNotice} placeholder="24 hours" onChange={(e) => set({ cancellationNotice: e.target.value })} />,
          )}
          {field(
            "Your nanny's insurance",
            <Input value={data.ownInsurance} placeholder="Public liability, £1m" onChange={(e) => set({ ownInsurance: e.target.value })} />,
          )}
        </div>
        <label className="mt-4 flex items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={data.allowSubstitute}
            onChange={(e) => set({ allowSubstitute: e.target.checked })}
          />
          <span>
            Allow your nanny to send an agreed, DBS-checked substitute
            <span className="mt-0.5 block text-xs text-muted-foreground">
              A real right to send a substitute is one of the signs of self-employment. Turning it off makes this look more like employment.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}
