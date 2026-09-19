export type AgreementFields = {
  employerNames: string | null;
  nannyName: string | null;
  startDate: string | null;
  workPattern: string | null;
  hours: string | null;
  hourlyRate: string | null;
  payBasis: string | null;
  holiday: string | null;
  noticePeriod: string | null;
  probation: string | null;
  duties: string | null;
  pension: string | null;
  additionalTerms: string | null;
};

export type Signature = {
  docKind: "agreement" | "terms";
  signerRole: "parent" | "nanny" | "agency";
  signerName: string;
  docVersion: string;
  signedAt: string;
};

export const AGREEMENT_SECTIONS: {
  key: keyof AgreementFields;
  label: string;
  textarea?: boolean;
  placeholder?: string;
}[] = [
  { key: "employerNames", label: "Employer name(s)", placeholder: "e.g. Mr & Mrs Smith" },
  { key: "nannyName", label: "Nanny / manny name" },
  { key: "startDate", label: "Start date", placeholder: "e.g. 2026-09-01" },
  { key: "workPattern", label: "Working days", textarea: true, placeholder: "e.g. Monday to Thursday, term time" },
  { key: "hours", label: "Hours of work", textarea: true, placeholder: "e.g. 3.00pm – 7.00pm" },
  { key: "hourlyRate", label: "Rate of pay", placeholder: "e.g. £15.00 per hour" },
  { key: "payBasis", label: "Pay basis & payday", placeholder: "e.g. Gross, paid monthly on the 28th" },
  { key: "holiday", label: "Holiday entitlement", textarea: true },
  { key: "noticePeriod", label: "Notice period", textarea: true },
  { key: "probation", label: "Probation period", textarea: true },
  { key: "duties", label: "Duties & responsibilities", textarea: true },
  { key: "pension", label: "Pension & tax", textarea: true },
  { key: "additionalTerms", label: "Additional terms", textarea: true },
];

export const EMPTY_AGREEMENT: AgreementFields = {
  employerNames: null,
  nannyName: null,
  startDate: null,
  workPattern: null,
  hours: null,
  hourlyRate: null,
  payBasis: null,
  holiday: null,
  noticePeriod: null,
  probation: null,
  duties: null,
  pension: null,
  additionalTerms: null,
};
