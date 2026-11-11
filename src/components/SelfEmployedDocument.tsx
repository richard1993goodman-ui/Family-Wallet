import { reviewLabel } from "@/lib/agreement-review";
import { formatUKDate, workingDayHours, type AgreementData } from "@/lib/agreement.model";

const blank = "___________________";

/** The services agreement for a nanny who is genuinely self-employed. Printable, like the other documents. */
export function SelfEmployedDocument({
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
  const rate = data.hourlyRate ? `£${data.hourlyRate} per hour` : blank;
  const sections: { title: string; body: React.ReactNode }[] = [
    {
      title: "1. The services",
      body: (
        <>
          <p>
            The Nanny will provide childcare services to the Client{data.workAddress ? ` at ${data.workAddress}` : ""}
            {data.servicesDescription ? `: ${data.servicesDescription}` : "."}
          </p>
          <p>
            The services start on {formatUKDate(data.startDate)}
            {data.endDate ? ` and end on ${formatUKDate(data.endDate)}, unless ended earlier under clause 12` : " and continue until ended under clause 12"}.
          </p>
        </>
      ),
    },
    {
      title: "2. Status",
      body: (
        <>
          <p>
            The Nanny provides the services as an independent self-employed person running their own business. Nothing in this
            agreement makes the Nanny an employee, worker or partner of the Client, and neither of them intends it to.
          </p>
          <p>
            Outside the booked sessions in clause 3, the Client is not obliged to offer work and the Nanny is not obliged to accept it.
            The Nanny decides how the services are delivered, within the Client's reasonable instructions about the children's care and safety.
            The Nanny is free to work for other clients.
          </p>
        </>
      ),
    },
    {
      title: "3. Booked sessions",
      body: days.length ? (
        <>
          <p>The agreed sessions are:</p>
          <ul className="mt-1 space-y-1">
            {days.map((d) => (
              <li key={d.day}>
                <span className="font-medium">{d.day}:</span> {d.startTime} to {d.endTime}
                {d.startTime2 && d.endTime2 ? ` and ${d.startTime2} to ${d.endTime2}` : ""}
                <span className="text-muted-foreground"> ({workingDayHours(d)} hours)</span>
              </li>
            ))}
          </ul>
          <p className="mt-1">Sessions can be changed by agreement between the Client and the Nanny.</p>
        </>
      ) : (
        <p>The sessions will be agreed between the Client and the Nanny and confirmed in the Family Wallet calendar.</p>
      ),
    },
    {
      title: "4. Fees and invoices",
      body: (
        <>
          <p>
            The Client pays the Nanny {rate} for the time the Nanny works. The Nanny invoices {data.paymentFrequency ? data.paymentFrequency.toLowerCase() : "monthly"}
            , and the Client pays each invoice within {data.invoiceDays || "14"} days{data.paymentMethod ? ` by ${data.paymentMethod}` : ""}.
          </p>
          <p>
            Agreed expenses are paid back{data.expenseRate ? ` (${data.expenseRate})` : ""} on receipt of the receipts. Anything over a small
            amount is agreed with the Client first.
          </p>
        </>
      ),
    },
    {
      title: "5. Tax and National Insurance",
      body: (
        <p>
          The Nanny is responsible for registering as self-employed, for their own tax and National Insurance, and for any VAT. The Client does
          not deduct tax or National Insurance and does not run PAYE for the Nanny.
        </p>
      ),
    },
    {
      title: "6. No employment benefits",
      body: (
        <p>
          The Nanny is paid only for the sessions they work. The Nanny is not entitled to holiday pay, sick pay, maternity or paternity pay, or a
          workplace pension from the Client. The Nanny chooses their own time off and gives the Client as much notice as they can so cover can be arranged.
        </p>
      ),
    },
    {
      title: "7. Cancelling a session",
      body: (
        <p>
          If the Client cancels a booked session with at least {data.cancellationNotice || "24 hours"} notice, nothing is payable. If the Client
          cancels later, the Nanny may charge for the booked hours, unless the Nanny is able to use the time for another client. If the Nanny cannot
          attend a session, they tell the Client as soon as possible and are not paid for it.
        </p>
      ),
    },
    {
      title: "8. Substitutes",
      body: data.allowSubstitute ? (
        <p>
          If the Nanny cannot attend, the Nanny may send a suitably qualified substitute, provided the Client has agreed the person beforehand and
          the substitute has an enhanced DBS check, relevant experience and insurance. The Client will not unreasonably refuse. The Nanny stays
          responsible for the services and pays the substitute.
        </p>
      ) : (
        <p>The Nanny will provide the services personally unless the Client agrees otherwise in writing.</p>
      ),
    },
    {
      title: "9. Insurance and checks",
      body: (
        <p>
          The Nanny holds their own insurance{data.ownInsurance ? `: ${data.ownInsurance}` : ", including public liability cover"}, and
          will show it to the Client on request. The Nanny has a current enhanced DBS check and a paediatric first aid certificate, and will keep them
          up to date. The Nanny will give the Client references on request.
        </p>
      ),
    },
    {
      title: "10. Safeguarding, confidentiality and data",
      body: (
        <>
          <p>
            The Nanny puts the children's safety and welfare first, follows the Client's reasonable rules (for example on screen time, food, and
            who may collect the children), and tells the Client promptly about any accident, injury or concern.
          </p>
          <p>
            The Nanny keeps the family's information private, including addresses, door and alarm codes and photographs, and does not post about the
            children or the home on social media without the Client's permission. Each party handles the other's personal data only as needed for the services and as the law requires.
          </p>
        </>
      ),
    },
    {
      title: "11. Responsibility",
      body: (
        <p>
          Each party is responsible for their own acts. Nothing in this agreement limits liability that cannot lawfully be limited, including for death or
          personal injury caused by negligence.
        </p>
      ),
    },
    {
      title: "12. Ending the agreement",
      body: (
        <p>
          Either party may end this agreement by giving {data.standardNotice || "2 weeks"} written notice, which can be given in the Family Wallet. Either
          party may end it immediately if the other seriously breaks it, or if there is a concern about a child's safety.
        </p>
      ),
    },
    {
      title: "13. General",
      body: (
        <p>
          This is the whole agreement between the Client and the Nanny about the services. Changes must be agreed in writing, which includes in the Family
          Wallet. It is governed by the law of England and Wales.
        </p>
      ),
    },
  ];

  return (
    <article className="rounded-2xl bg-card p-6 text-sm leading-relaxed text-foreground shadow-sm sm:p-8 print:p-0 print:shadow-none">
      <header className="mb-8 border-b border-border pb-6 text-center">
        <p className="heading-display text-lg text-primary">Family Wallet</p>
        <h1 className="heading-display mt-1 text-xl text-foreground">Services agreement for a self-employed nanny</h1>
        {(familyName || version) && (
          <p className="mt-2 text-xs text-muted-foreground">
            {familyName ? `${familyName} · ` : ""}
            {version ? `version ${version}` : ""}
            {issuedAt
              ? ` · issued ${new Date(issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
              : ""}
          </p>
        )}
      </header>

      <section className="mb-8">
        <h2 className="heading-display mb-3 text-base">Between</h2>
        <p>
          <span className="font-medium">The Client:</span> {data.employerName || blank}
          {data.employerAddress ? `, ${data.employerAddress}` : ""}
        </p>
        <p className="mt-1">
          <span className="font-medium">The Nanny (self-employed):</span> {data.nannyName || blank}
        </p>
      </section>

      {sections.map((s) => (
        <section key={s.title} className="mb-6 space-y-2">
          <h2 className="heading-display text-base">{s.title}</h2>
          {s.body}
        </section>
      ))}
      <p className="mt-6 text-xs text-muted-foreground">{reviewLabel(null).text}</p>
    </article>
  );
}
