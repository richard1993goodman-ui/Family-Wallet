import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

import {
  CONTRACT_TYPE_LABELS,
  RATE_BASIS_LABELS,
  DEFAULT_WEEKS_PER_YEAR,
  calculateHoliday,
  defaultDuties,
  isTermTime,
  workingDayHours,
  type AgreementData,
  type ContractType,
  type NannyDuty,
  type WorkingDay,
} from "@/lib/agreement.model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

type Update = (patch: Partial<AgreementData>) => void;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="heading-display text-lg text-foreground">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </label>
  );
}

function Text({
  value,
  onChange,
  placeholder,
  type,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Input
      type={type ?? "text"}
      value={value}
      placeholder={placeholder ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Area({
  value,
  onChange,
  placeholder,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Textarea
      rows={rows ?? 3}
      value={value}
      placeholder={placeholder ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function WorkingDaysEditor({
  days,
  onChange,
}: {
  days: WorkingDay[];
  onChange: (days: WorkingDay[]) => void;
}) {
  const set = (index: number, patch: Partial<WorkingDay>) => {
    const next = days.map((d, i) => (i === index ? { ...d, ...patch } : d));
    onChange(next);
  };

  const toggleSplit = (index: number) => {
    const selectedDay = days[index];
    if (!selectedDay) return;
    const day = { ...selectedDay };
    if (day.startTime2 !== undefined) {
      delete day.startTime2;
      delete day.endTime2;
    } else {
      day.startTime2 = "15:00";
      day.endTime2 = "19:00";
    }
    onChange(days.map((d, i) => (i === index ? day : d)));
  };

  return (
    <div className="space-y-2.5">
      {days.map((day, index) => (
        <div
          key={day.day}
          className={`rounded-xl border p-3 ${
            day.enabled ? "border-primary/25 bg-primary/5" : "border-transparent bg-muted/50"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-w-[120px] cursor-pointer items-center gap-2.5">
              <Checkbox
                checked={day.enabled}
                onCheckedChange={(checked) => set(index, { enabled: checked === true })}
              />
              <span
                className={`text-sm font-medium ${day.enabled ? "text-foreground" : "text-muted-foreground"}`}
              >
                {day.day}
              </span>
            </label>
            {day.enabled && (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <Input
                  type="time"
                  className="w-auto flex-1"
                  value={day.startTime}
                  onChange={(e) => set(index, { startTime: e.target.value })}
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="time"
                  className="w-auto flex-1"
                  value={day.endTime}
                  onChange={(e) => set(index, { endTime: e.target.value })}
                />
                <span className="text-xs text-muted-foreground">
                  {workingDayHours(day).toFixed(1)}h
                </span>
                <button
                  type="button"
                  onClick={() => toggleSplit(index)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
                >
                  {day.startTime2 !== undefined ? (
                    <>
                      <X className="h-3.5 w-3.5" /> Remove second block
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" /> Split shift
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {day.enabled && day.startTime2 !== undefined && (
            <div className="mt-2.5 flex items-center gap-2 pl-[132px] max-sm:pl-0">
              <Input
                type="time"
                className="w-auto flex-1"
                value={day.startTime2 ?? ""}
                onChange={(e) => set(index, { startTime2: e.target.value })}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="time"
                className="w-auto flex-1"
                value={day.endTime2 ?? ""}
                onChange={(e) => set(index, { endTime2: e.target.value })}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DutyEditor({
  duties,
  onChange,
}: {
  duties: NannyDuty[];
  onChange: (duties: NannyDuty[]) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const standardIds = new Set(defaultDuties.map((d) => d.id));

  const set = (id: string, patch: Partial<NannyDuty>) =>
    onChange(duties.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  return (
    <div className="space-y-2">
      {duties.map((duty) => {
        const isCustom = !standardIds.has(duty.id);
        const open = expanded === duty.id;
        return (
          <div key={duty.id} className="rounded-xl border border-border bg-background">
            <div className="flex items-start gap-3 p-3">
              <Checkbox
                className="mt-0.5"
                checked={duty.enabled}
                onCheckedChange={(checked) => set(duty.id, { enabled: checked === true })}
              />
              <button
                type="button"
                onClick={() => setExpanded(open ? null : duty.id)}
                className="flex-1 text-left text-sm text-foreground"
              >
                {duty.label || "Custom duty"}
                {duty.details.trim() && (
                  <span className="block text-xs text-muted-foreground">{duty.details}</span>
                )}
              </button>
              {isCustom && (
                <button
                  type="button"
                  aria-label="Remove duty"
                  onClick={() => onChange(duties.filter((d) => d.id !== duty.id))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {open && (
              <div className="space-y-2 px-3 pb-3">
                {isCustom && (
                  <Input
                    value={duty.label}
                    placeholder="Describe this duty"
                    onChange={(e) => set(duty.id, { label: e.target.value })}
                  />
                )}
                <Textarea
                  rows={2}
                  value={duty.details}
                  placeholder="Add specific details for this duty…"
                  onChange={(e) => set(duty.id, { details: e.target.value })}
                />
              </div>
            )}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() =>
          onChange([
            ...duties,
            { id: `custom-${Date.now()}`, label: "", details: "", enabled: true },
          ])
        }
      >
        <Plus className="mr-2 h-4 w-4" /> Add custom duty
      </Button>
    </div>
  );
}

export function AgreementBuilder({
  data,
  onChange,
}: {
  data: AgreementData;
  onChange: (data: AgreementData) => void;
}) {
  const update: Update = (patch) => onChange({ ...data, ...patch });
  const holiday = calculateHoliday(data.workingDays, data.contractType, data.weeksPerYear);

  return (
    <div className="space-y-5">
      <Section title="Parties">
        <Labelled label="Employer name(s)">
          <Text
            value={data.employerName}
            onChange={(v) => update({ employerName: v })}
            placeholder="Full name of the employer"
          />
        </Labelled>
        <Labelled label="Employer address">
          <Text
            value={data.employerAddress}
            onChange={(v) => update({ employerAddress: v })}
            placeholder="Home address"
          />
        </Labelled>
        <Labelled label="Nanny / manny name">
          <Text value={data.nannyName} onChange={(v) => update({ nannyName: v })} />
        </Labelled>
        <Labelled label="Work address">
          <Text
            value={data.workAddress}
            onChange={(v) => update({ workAddress: v })}
            placeholder="Where the nanny will work"
          />
        </Labelled>
      </Section>

      <Section title="Employment">
        <Labelled label="Job title">
          <Text value={data.jobTitle} onChange={(v) => update({ jobTitle: v })} />
        </Labelled>
        <Labelled label="Start date">
          <Text type="date" value={data.startDate} onChange={(v) => update({ startDate: v })} />
        </Labelled>
        <label className="flex items-center gap-2.5">
          <Checkbox
            checked={data.isFixedTerm}
            onCheckedChange={(checked) => update({ isFixedTerm: checked === true })}
          />
          <span className="text-sm font-medium text-foreground">
            Fixed-period contract (has an end date)
          </span>
        </label>
        {data.isFixedTerm && (
          <div className="space-y-4 rounded-xl bg-muted/50 p-4">
            <Labelled label="End date">
              <Text type="date" value={data.endDate} onChange={(v) => update({ endDate: v })} />
            </Labelled>
            <Labelled label="Reason for the fixed period">
              <Text
                value={data.fixedTermReason}
                onChange={(v) => update({ fixedTermReason: v })}
                placeholder="e.g. childcare cover during a work assignment"
              />
            </Labelled>
          </div>
        )}
        <Labelled label="Probation period">
          <Text
            value={data.probationPeriod}
            onChange={(v) => update({ probationPeriod: v })}
            placeholder="e.g. 3 months"
          />
        </Labelled>
        <Labelled label="Overtime policy">
          <Area value={data.overtimePolicy} onChange={(v) => update({ overtimePolicy: v })} />
        </Labelled>
      </Section>

      <Section title="Duties">
        <DutyEditor duties={data.duties} onChange={(duties) => update({ duties })} />
        <Labelled label="Other duties clause">
          <Area value={data.otherDutiesClause} onChange={(v) => update({ otherDutiesClause: v })} />
        </Labelled>
      </Section>

      <Section title="Working pattern">
        <Labelled label="Contract type">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={data.contractType}
            onChange={(e) => {
              const contractType = e.target.value as ContractType;
              update({
                contractType,
                weeksPerYear: String(DEFAULT_WEEKS_PER_YEAR[contractType]),
              });
            }}
          >
            {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map((type) => (
              <option key={type} value={type}>
                {CONTRACT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled
          label="Weeks worked per year"
          hint={
            isTermTime(data.contractType)
              ? "Term-time contracts are usually 36 weeks. Change it to match this family's school year."
              : "Usually 52 for a year-round contract."
          }
        >
          <Text value={data.weeksPerYear} onChange={(v) => update({ weeksPerYear: v })} />
        </Labelled>
        <div className="space-y-3 rounded-xl bg-muted/50 p-4">
          <label className="flex items-start gap-2.5">
            <Checkbox
              className="mt-0.5"
              checked={data.includeWorkingPatternClause}
              onCheckedChange={(checked) => update({ includeWorkingPatternClause: checked === true })}
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Include the working-pattern clause in the agreement
              </span>
              <span className="block text-xs text-muted-foreground">
                Turn this off to remove clause 1.6 from the printable agreement.
              </span>
            </span>
          </label>
          {isTermTime(data.contractType) && (
            <label className="flex items-start gap-2.5">
              <Checkbox
                className="mt-0.5"
                checked={data.allowSchoolHolidayWork}
                onCheckedChange={(checked) => update({ allowSchoolHolidayWork: checked === true })}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  The nanny may be offered school-holiday work if needed and available
                </span>
                <span className="block text-xs text-muted-foreground">
                  Adds wording that holiday work is optional, agreed in advance and paid separately.
                </span>
              </span>
            </label>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Working days</p>
          <p className="mb-2 text-xs text-muted-foreground">
            Tick each day and set the hours. Use “Split shift” for a morning and an after-school
            block.
          </p>
          <WorkingDaysEditor
            days={data.workingDays}
            onChange={(workingDays) => update({ workingDays })}
          />
        </div>
      </Section>

      <Section title="Holiday (pro-rata)">
        <label className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-4">
          <Checkbox
            className="mt-0.5"
            checked={data.includeHolidayEntitlement}
            onCheckedChange={(checked) => update({ includeHolidayEntitlement: checked === true })}
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Include the holiday entitlement section in the agreement
            </span>
            <span className="block text-xs text-muted-foreground">
              Turn this off to remove section 3 from the printable agreement.
            </span>
          </span>
        </label>
        {data.includeHolidayEntitlement && holiday.workingDaysPerWeek > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: holiday.totalWeeksEntitlement, label: "Weeks" },
                { value: holiday.totalDaysEntitlement, label: "Days" },
                { value: holiday.totalHoursEntitlement, label: "Hours" },
              ].map((cell) => (
                <div key={cell.label} className="rounded-xl bg-primary/10 p-4 text-center">
                  <div className="heading-display text-2xl text-primary">{cell.value}</div>
                  <div className="text-xs text-muted-foreground">{cell.label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {holiday.workingDaysPerWeek} days a week ({holiday.weeklyHours.toFixed(1)} hours) over{" "}
              {holiday.weeksWorkedPerYear} weeks per year. UK statutory entitlement is 5.6 weeks for
              a full year
              {isTermTime(data.contractType)
                ? `, pro-rated here as 5.6 × ${holiday.weeksWorkedPerYear} ÷ 46.4.`
                : "."}
            </p>
          </>
        ) : data.includeHolidayEntitlement ? (
          <p className="text-sm text-muted-foreground">
            Tick at least one working day to calculate the holiday entitlement.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            The holiday entitlement section will be left out of the printable agreement.
          </p>
        )}
        <Labelled
          label="Holiday wording (override)"
          hint="If filled in, this appears instead of the calculated holiday wording."
        >
          <Area value={data.holidayAllowance} onChange={(v) => update({ holidayAllowance: v })} />
        </Labelled>
        {data.includeHolidayEntitlement && (
          <label className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-4">
            <Checkbox
              className="mt-0.5"
              checked={data.rolledUpHolidayPay}
              onCheckedChange={(checked) => update({ rolledUpHolidayPay: checked === true })}
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Roll holiday pay up into each payslip
              </span>
              <span className="block text-xs text-muted-foreground">
                For term-time and part-year nannies: holiday pay is paid at 12.07% with each
                payslip instead of being paid when holiday is taken.
              </span>
            </span>
          </label>
        )}
      </Section>

      <Section title="Pay">
        <Labelled label="Hourly rate (£)">
          <Text
            value={data.hourlyRate}
            onChange={(v) => update({ hourlyRate: v })}
            placeholder="e.g. 15.00"
          />
        </Labelled>
        <Labelled
          label="Is that rate gross or net?"
          hint="Gross is before tax and National Insurance. Net is take-home pay."
        >
          <div className="flex gap-2">
            {(["gross", "net"] as const).map((basis) => (
              <button
                key={basis}
                type="button"
                onClick={() => update({ rateBasis: basis })}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  data.rateBasis === basis
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {RATE_BASIS_LABELS[basis]}
              </button>
            ))}
          </div>
        </Labelled>
        <label className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-4">
          <Checkbox
            className="mt-0.5"
            checked={data.includeTaxResponsibilityClause}
            onCheckedChange={(checked) =>
              update({ includeTaxResponsibilityClause: checked === true })
            }
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Include tax, National Insurance and pension responsibility wording
            </span>
            <span className="block text-xs text-muted-foreground">
              Turn this off to remove the PAYE/HMRC sentence from clause 2.1.
            </span>
          </span>
        </label>
        <Labelled label="Payment frequency">
          <Text value={data.paymentFrequency} onChange={(v) => update({ paymentFrequency: v })} />
        </Labelled>
        <Labelled label="Payment method">
          <Text value={data.paymentMethod} onChange={(v) => update({ paymentMethod: v })} />
        </Labelled>
        <Labelled label="Benefits">
          <Area value={data.benefits} onChange={(v) => update({ benefits: v })} rows={2} />
        </Labelled>
        <Labelled
          label="Mileage / expense rate (pence per mile)"
          hint="Leave blank to leave expenses out of the contract."
        >
          <Text
            value={data.expenseRate}
            onChange={(v) => update({ expenseRate: v })}
            placeholder="45"
          />
        </Labelled>
        <Labelled label="Pension" hint="Leave blank to leave the pension clause out.">
          <Area value={data.pension} onChange={(v) => update({ pension: v })} />
        </Labelled>
      </Section>

      <Section title="Sickness & notice">
        <Labelled label="Sickness policy">
          <Area value={data.sicknessPolicy} onChange={(v) => update({ sicknessPolicy: v })} />
        </Labelled>
        <Labelled label="Notice during probation">
          <Text value={data.probationNotice} onChange={(v) => update({ probationNotice: v })} />
        </Labelled>
        <Labelled label="Notice thereafter">
          <Text value={data.standardNotice} onChange={(v) => update({ standardNotice: v })} />
        </Labelled>
        <Labelled label="Garden leave">
          <Area value={data.gardenLeave} onChange={(v) => update({ gardenLeave: v })} rows={2} />
        </Labelled>
      </Section>

      <Section title="Legal & compliance">
        <Labelled label="Grievance procedure">
          <Area value={data.grievanceProcedure} onChange={(v) => update({ grievanceProcedure: v })} />
        </Labelled>
        <Labelled label="Disciplinary procedure">
          <Area
            value={data.disciplinaryProcedure}
            onChange={(v) => update({ disciplinaryProcedure: v })}
          />
        </Labelled>
        <Labelled label="Data protection (GDPR)">
          <Area value={data.dataProtection} onChange={(v) => update({ dataProtection: v })} />
        </Labelled>
        <Labelled label="DBS check">
          <Area value={data.dbsChecked} onChange={(v) => update({ dbsChecked: v })} rows={2} />
        </Labelled>
        <Labelled label="References">
          <Area value={data.references} onChange={(v) => update({ references: v })} rows={2} />
        </Labelled>
      </Section>
    </div>
  );
}
