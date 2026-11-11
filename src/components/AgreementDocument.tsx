import {
  calculateHoliday, rotaWeek2,
  formatUKDate,
  isTermTime,
  type AgreementData,
} from "@/lib/agreement.model";

function workingPatternClause(data: AgreementData) {
  const schoolHolidayAddendum =
    data.allowSchoolHolidayWork && isTermTime(data.contractType)
      ? " The Employer may offer additional work during school holidays where cover is needed and the Nanny is available. Any such hours must be agreed in advance by both parties and will be paid at the Nanny’s agreed hourly rate, unless otherwise agreed in writing."
      : "";

  if (data.contractType === "part-time-term-time") {
    return `This is a part-time, term-time only contract. The Nanny shall normally work ${data.weeksPerYear || "36"} weeks per year during school term time, on the days and hours set out above, and shall not be required to work during school holidays.${schoolHolidayAddendum}`;
  }

  if (data.contractType === "term-time") {
    return `This is a term-time only contract. The Nanny shall normally work ${data.weeksPerYear || "36"} weeks per year during school term time and shall not be required to work during school holidays.${schoolHolidayAddendum}`;
  }

  return `This is a year-round contract of ${data.weeksPerYear || "52"} weeks per year.`;
}

export function AgreementDocument({
  data,
  version,
  issuedAt,
  familyName,
}: {
  data: AgreementData;
  version?: number;
  issuedAt?: string | null;
  familyName?: string;
}) {
  const enabledDuties = data.duties.filter((d) => d.enabled && d.label.trim());
  const enabledDays = data.workingDays.filter((d) => d.enabled);
  const holiday = calculateHoliday(data.workingDays, data.contractType, data.weeksPerYear, rotaWeek2(data));

  return (
    <article className="rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-foreground shadow-sm sm:p-8 print:border-0 print:p-0 print:shadow-none">
      <header className="mb-8 border-b border-border pb-6 text-center">
        <p className="heading-display text-lg text-primary">Family Wallet</p>
        <h1 className="heading-display mt-1 text-xl text-foreground">
          Contract of employment for a nanny or male nanny
        </h1>
        {(familyName || version) && (
          <p className="mt-2 text-xs text-muted-foreground">
            {familyName ? `${familyName} · ` : ""}
            {version ? `version ${version}` : ""}
            {issuedAt
              ? ` · issued ${new Date(issuedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}`
              : ""}
          </p>
        )}
      </header>

      <section className="mb-8">
        <h2 className="heading-display mb-3 text-base">Between</h2>
        <p>
          <strong>(1) “the Employer”:</strong>{" "}
          {data.employerName || "___________________"}
          {data.employerAddress ? `, ${data.employerAddress}` : ""}
        </p>
        <p className="mt-2">
          <strong>(2) “the Nanny”:</strong> {data.nannyName || "___________________"}
        </p>
        <p className="mt-4 text-muted-foreground">
          It is agreed that the Employer will employ the Nanny on the following terms and
          conditions:
        </p>
      </section>

      <section className="mb-8 space-y-4">
        <h2 className="heading-display text-base">1. Terms of employment</h2>
        <p>
          <strong>1.1</strong> The Nanny is employed as {data.jobTitle || "Nanny"} to work at the
          Employer’s home at {data.workAddress || "___________________"} or such other place(s) as
          the Employer may reasonably require from time to time. The employment commences on{" "}
          {formatUKDate(data.startDate)}
          {data.isFixedTerm && data.endDate ? (
            <>
              {" "}
              and is a fixed-term appointment ending on {formatUKDate(data.endDate)}
              {data.fixedTermReason ? `, for the purpose of ${data.fixedTermReason}` : ""}. The
              employment will terminate automatically on that date without further notice, unless
              the parties agree in writing to extend or end it earlier in accordance with the
              notice provisions of this agreement.
            </>
          ) : (
            "."
          )}
        </p>

        {data.probationPeriod && (
          <p>
            <strong>1.2</strong> The first {data.probationPeriod} of employment constitute a
            probationary period, during which the Employer will assess the Nanny’s suitability for
            the role and the Nanny will assess whether the role is suitable for them.
          </p>
        )}

        <div>
          <p>
            <strong>1.3</strong> The Nanny’s duties shall be:
          </p>
          <ul className="mt-2 ml-4 space-y-1.5">
            {enabledDuties.length > 0 ? (
              enabledDuties.map((duty, index) => (
                <li key={duty.id}>
                  <strong>{String.fromCharCode(97 + index)}.</strong> {duty.label}
                  {duty.details.trim() && (
                    <span className="text-muted-foreground"> — {duty.details}</span>
                  )}
                </li>
              ))
            ) : (
              <li className="italic text-muted-foreground">No duties specified</li>
            )}
          </ul>
          {data.otherDutiesClause && <p className="mt-2 ml-4">{data.otherDutiesClause}</p>}
        </div>

        <div>
          <p>
            <strong>1.4</strong> The Nanny shall normally work the following days
            {data.rotaWeeks === 2 ? ", on a two-week rolling rota" : ""}:
          </p>
          {(data.rotaWeeks === 2
            ? [
                { label: "Week 1", days: enabledDays },
                { label: "Week 2", days: data.workingDaysWeek2.filter((d) => d.enabled) },
              ]
            : [{ label: "", days: enabledDays }]
          ).map((week) => (
            <div key={week.label || "week"}>
              {week.label && <p className="mt-2 ml-4 font-medium">{week.label}</p>}
              <ul className="mt-2 ml-4 space-y-1">
                {week.days.length > 0 ? (
                  week.days.map((day) => (
                    <li key={day.day}>
                      {day.day}: {day.startTime} – {day.endTime}
                      {day.startTime2 && day.endTime2
                        ? ` and ${day.startTime2} – ${day.endTime2}`
                        : ""}
                    </li>
                  ))
                ) : (
                  <li className="italic text-muted-foreground">
                    {week.label ? "No working days this week" : "Working days to be agreed"}
                  </li>
                )}
              </ul>
            </div>
          ))}
          {data.rotaWeeks === 2 && (
            <p className="mt-2 ml-4">
              This averages {holiday.weeklyHours.toFixed(1)} hours ({holiday.workingDaysPerWeek} days)
              per week over the two-week cycle
              {data.rotaStartDate ? `; week 1 begins on the week commencing ${formatUKDate(data.rotaStartDate)}` : ""}.
            </p>
          )}
        </div>

        {data.overtimePolicy && (
          <p>
            <strong>1.5</strong> {data.overtimePolicy}
          </p>
        )}

        {data.includeWorkingPatternClause && (
          <p>
            <strong>1.6</strong> {workingPatternClause(data)}
          </p>
        )}
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="heading-display text-base">2. Remuneration</h2>
        <p>
          <strong>2.1</strong> The Nanny’s salary will be £{data.hourlyRate || "___"} per hour{" "}
          {data.rateBasis === "net" ? "net (take-home)" : "gross (before deductions)"}.
          {data.includeTaxResponsibilityClause
            ? data.rateBasis === "net"
              ? " The Employer is responsible for all PAYE tax, National Insurance and pension contributions payable in addition to this net figure."
              : " Income tax, National Insurance and pension contributions will be deducted from this gross figure."
            : ""}
        </p>
        <p>
          <strong>2.2</strong> The salary shall be payable in arrears{" "}
          {(data.paymentFrequency || "monthly").toLowerCase()} by{" "}
          {(data.paymentMethod || "bank transfer").toLowerCase()}.
        </p>
        <p>
          <strong>2.3</strong> The Nanny shall receive the following benefits:{" "}
          {data.benefits || "none specified"}.
        </p>
        {data.expenseRate && (
          <p>
            <strong>2.4</strong> The Nanny shall be reimbursed for all reasonable expenses. Petrol
            costs will be reimbursed at the rate of {data.expenseRate} pence per mile.
          </p>
        )}
      </section>

      {data.includeHolidayEntitlement && (
        <section className="mb-8">
          <h2 className="heading-display mb-3 text-base">3. Holiday</h2>
          {data.holidayAllowance.trim() ? (
            <p>{data.holidayAllowance}</p>
          ) : enabledDays.length > 0 ? (
            <p>
              The Nanny is entitled to {holiday.totalWeeksEntitlement} weeks (
              {holiday.totalDaysEntitlement} days / {holiday.totalHoursEntitlement} hours) paid
              holiday per annum, pro-rated based on their working pattern of{" "}
              {holiday.weeklyHours.toFixed(1)} hours per week over {holiday.weeksWorkedPerYear} weeks
              per year{isTermTime(data.contractType) ? " (term time only)" : ""}.
              {isTermTime(data.contractType)
                ? " Holiday shall normally be taken during school holidays."
                : ""}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Holiday details to be agreed based on working pattern.
            </p>
          )}
          {data.rolledUpHolidayPay && (
            <p className="mt-3">
              Holiday pay will be “rolled up” and paid together with the Nanny’s salary for each
              pay period, calculated at 12.07% of the pay for the hours worked in that period and
              shown separately on each payslip. The Nanny’s holiday should be taken during school
              holidays or other non-working periods; no separate payment is made when holiday is
              taken, as holiday pay has already been paid throughout the year.
            </p>
          )}
        </section>
      )}

      {data.sicknessPolicy && (
        <section className="mb-8">
          <h2 className="heading-display mb-3 text-base">4. Sickness</h2>
          <p>{data.sicknessPolicy}</p>
        </section>
      )}

      {data.pension && (
        <section className="mb-8">
          <h2 className="heading-display mb-3 text-base">5. Pension</h2>
          <p>{data.pension}</p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="heading-display mb-3 text-base">6. Confidentiality</h2>
        <p>
          The Nanny shall not during their employment with the Employer, or at any time thereafter,
          divulge or disclose any information which is confidential to the Employer.
          Confidentiality extends to disclosing any information on social media.
        </p>
      </section>

      {data.dataProtection && (
        <section className="mb-8">
          <h2 className="heading-display mb-3 text-base">7. Data protection</h2>
          <p>{data.dataProtection}</p>
        </section>
      )}

      {(data.grievanceProcedure || data.disciplinaryProcedure) && (
        <section className="mb-8 space-y-3">
          <h2 className="heading-display text-base">8. Grievance and disciplinary procedures</h2>
          {data.grievanceProcedure && (
            <p>
              <strong>8.1 Grievance.</strong> {data.grievanceProcedure}
            </p>
          )}
          {data.disciplinaryProcedure && (
            <p>
              <strong>8.2 Disciplinary.</strong> {data.disciplinaryProcedure}
            </p>
          )}
        </section>
      )}

      {(data.dbsChecked || data.references) && (
        <section className="mb-8 space-y-2">
          <h2 className="heading-display text-base">9. Checks and references</h2>
          {data.dbsChecked && <p>{data.dbsChecked}</p>}
          {data.references && <p>{data.references}</p>}
        </section>
      )}

      <section className="mb-4 space-y-2">
        <h2 className="heading-display text-base">10. Termination</h2>
        <p>If either party wishes to terminate this contract, the notice to be given shall be:</p>
        <ul className="ml-4 space-y-1">
          <li>(a) During probationary period: {data.probationNotice || "1 week"}</li>
          <li>(b) Thereafter: {data.standardNotice || "4 weeks"} in writing</li>
        </ul>
        {data.gardenLeave && <p>{data.gardenLeave}</p>}
      </section>
    </article>
  );
}
