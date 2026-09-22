import { formatUKDate, type AgreementData } from "@/lib/agreement.model";

/** The short "written statement of employment particulars" alternative to the full contract. */
export function StatementDocument({
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
  const days = data.workingDays.filter((d) => d.enabled);
  const paragraphs = data.statementBody
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const rows: [string, string][] = [
    ["Employer", data.employerName || "___________________"],
    ["Nanny", data.nannyName || "___________________"],
    ["Job title", data.jobTitle || "Nanny"],
    ["Place of work", data.workAddress || "___________________"],
    ["Start date", formatUKDate(data.startDate)],
    [
      "Pay",
      data.hourlyRate
        ? `£${data.hourlyRate} per hour ${data.rateBasis === "net" ? "net (take-home)" : "gross (before deductions)"}`
        : "___________________",
    ],
    ["Paid", data.paymentFrequency || "Monthly"],
    ["Notice", data.standardNotice || "4 weeks"],
  ];

  return (
    <article className="rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-foreground shadow-sm sm:p-8 print:border-0 print:p-0 print:shadow-none">
      <header className="mb-8 border-b border-border pb-6 text-center">
        <p className="heading-display text-lg text-primary">Athlete Mannies &amp; Nannies</p>
        <h1 className="heading-display mt-1 text-xl text-foreground">
          Written statement of employment particulars
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
        <h2 className="heading-display mb-3 text-base">The basics</h2>
        <dl className="space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap gap-x-3">
              <dt className="w-40 font-medium text-muted-foreground">{label}</dt>
              <dd className="flex-1">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="heading-display mb-3 text-base">Days and hours</h2>
        {days.length ? (
          <ul className="ml-4 space-y-1">
            {days.map((day) => (
              <li key={day.day}>
                {day.day}: {day.startTime} – {day.endTime}
                {day.startTime2 && day.endTime2 ? ` and ${day.startTime2} – ${day.endTime2}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="italic text-muted-foreground">Days and hours to be agreed.</p>
        )}
      </section>

      {paragraphs.length > 0 && (
        <section className="mb-4 space-y-3">
          {paragraphs.map((paragraph, index) => {
            const heading = /^[A-Z][^.!?]{2,60}$/.test(paragraph);
            return heading ? (
              <h2 key={index} className="heading-display pt-2 text-base">
                {paragraph}
              </h2>
            ) : (
              <p key={index}>{paragraph}</p>
            );
          })}
        </section>
      )}
    </article>
  );
}
