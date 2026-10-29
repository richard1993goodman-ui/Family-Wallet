import { CheckCircle2, Shield } from "lucide-react";

const commitmentPoints = [
  "Guaranteed backup care — so your family is never left without support",
  "Ongoing placement support throughout your time with us",
  "WhatsApp support 7 days a week, Monday to Sunday",
  "Fully vetted nannies & mannies — Enhanced DBS, references, ID & Right-to-Work checks on every carer",
  "Transparent, cost-effective pricing with no hidden fees",
  "Access to babysitters, holiday care and SEN-experienced carers whenever you need them",
  "Extra babysitters available for date nights, events and additional cover",
  "Emergency childcare support when the unexpected happens",
  "Sports coaches to keep your children active, confident and engaged",
  "Specialist tutors for 7+ and 11+ entrance exam preparation",
];

export function GuaranteeContent() {
  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h2 className="heading-display text-2xl text-foreground">Our Commitment &amp; Guarantee</h2>
        <p className="mt-1 text-sm italic text-muted-foreground">Athlete Mannies &amp; Nannies</p>
      </div>

      <div className="space-y-4 text-[15px] leading-relaxed text-foreground">
        <p className="font-semibold">To our valued family,</p>
        <p>
          We at <strong>Athlete Mannies &amp; Nannies</strong> understand that entrusting someone
          with the care of your children is one of the most important decisions you will ever make.
          That is why we make the following commitment to you — not as a formality, but as a genuine
          promise from our agency to your family.
        </p>
        <p>
          With over <strong>11 years of trusted placements</strong> and consistently{" "}
          <strong>5-star family reviews</strong>, we have built our reputation on a personal,
          relationship-led service that families truly depend on.
        </p>
      </div>

      <h3 className="heading-display mt-8 mb-4 text-lg text-foreground">
        We guarantee the following:
      </h3>
      <div className="space-y-3">
        {commitmentPoints.map((point) => (
          <div key={point} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <p className="text-[15px] leading-relaxed text-foreground">{point}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 border-l-4 border-primary/30 py-2 pl-5">
        <p className="text-[15px] italic leading-relaxed text-foreground">
          "We promise to support your family <strong>Monday to Sunday, year round</strong>. Your
          children's safety, happiness, and wellbeing are at the heart of everything we do. This is
          our guarantee to you."
        </p>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Richard Goodman, on behalf of your agency &amp; Nannies
      </p>
    </div>
  );
}
