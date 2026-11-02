/** Full nanny agreement model — shared by the admin builder, the wallet view and the server. */

export interface NannyDuty {
  id: string;
  label: string;
  details: string;
  enabled: boolean;
}

export interface WorkingDay {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  /** Optional second block for split shifts (e.g. 15:00–19:00 after a 07:00–09:00 morning block). */
  startTime2?: string;
  endTime2?: string;
}

const toMinutes = (t: string): number => {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Total hours worked in a day, including an optional split-shift second block. */
export const workingDayHours = (day: WorkingDay): number => {
  let hours = (toMinutes(day.endTime) - toMinutes(day.startTime)) / 60;
  if (day.startTime2 && day.endTime2) {
    hours += (toMinutes(day.endTime2) - toMinutes(day.startTime2)) / 60;
  }
  return Math.max(0, hours);
};

export type ContractType = "year-round" | "term-time" | "part-time-term-time";

export const isTermTime = (type: ContractType): boolean =>
  type === "term-time" || type === "part-time-term-time";

export const DEFAULT_WEEKS_PER_YEAR: Record<ContractType, number> = {
  "year-round": 52,
  "term-time": 36,
  "part-time-term-time": 36,
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  "year-round": "Full time, year round",
  "term-time": "Term-time only",
  "part-time-term-time": "Part time, term time only",
};

export type RateBasis = "gross" | "net";

export const RATE_BASIS_LABELS: Record<RateBasis, string> = {
  gross: "Gross (before tax)",
  net: "Net (take-home)",
};

/** Which kind of document the family has chosen: the full formal contract, or a short written statement. */
export type DocumentStyle = "full" | "statement";

export const DOCUMENT_STYLE_LABELS: Record<DocumentStyle, string> = {
  full: "Full nanny contract",
  statement: "Written statement of particulars",
};

export interface AgreementData {
  /** "full" = formal contract, "statement" = short written statement of employment particulars. */
  documentStyle: DocumentStyle;
  /** The written statement wording (used only when documentStyle is "statement"). */
  statementBody: string;
  employerName: string;
  employerAddress: string;
  nannyName: string;

  jobTitle: string;
  workAddress: string;
  startDate: string;
  isFixedTerm: boolean;
  endDate: string;
  fixedTermReason: string;
  probationPeriod: string;
  overtimePolicy: string;

  duties: NannyDuty[];
  otherDutiesClause: string;

  workingDays: WorkingDay[];
  /** 1 = same days every week; 2 = alternating two-week rolling rota (workingDays is week 1). */
  rotaWeeks: 1 | 2;
  /** Week 2 of a two-week rolling rota. */
  workingDaysWeek2: WorkingDay[];
  /** Optional date (YYYY-MM-DD) of a Monday that starts a "week 1". */
  rotaStartDate: string;
  contractType: ContractType;
  weeksPerYear: string;
  /** Whether clause 1.6 describing the annual working pattern appears in the printable agreement. */
  includeWorkingPatternClause: boolean;
  /** For term-time contracts, whether school-holiday work may be offered if needed and the nanny is available. */
  allowSchoolHolidayWork: boolean;

  hourlyRate: string;
  /** Whether the hourly rate quoted is gross (before tax) or net (take-home). */
  rateBasis: RateBasis;
  /** Whether clause 2.1 includes tax, National Insurance and pension responsibility wording. */
  includeTaxResponsibilityClause: boolean;
  paymentMethod: string;
  paymentFrequency: string;
  benefits: string;
  expenseRate: string;

  pension: string;
  /** Whether the holiday entitlement section appears in the printable agreement. */
  includeHolidayEntitlement: boolean;
  holidayAllowance: string;
  /** Whether holiday pay is rolled up and paid with each payslip (part-year / term-time workers). */
  rolledUpHolidayPay: boolean;
  sicknessPolicy: string;

  grievanceProcedure: string;
  disciplinaryProcedure: string;
  dataProtection: string;
  dbsChecked: string;
  references: string;
  gardenLeave: string;

  probationNotice: string;
  standardNotice: string;
}

export interface HolidayCalculation {
  totalWeeksEntitlement: number;
  totalDaysEntitlement: number;
  totalHoursEntitlement: number;
  weeklyHours: number;
  workingDaysPerWeek: number;
  weeksWorkedPerYear: number;
  contractType: ContractType;
}

const UK_STATUTORY_WEEKS = 5.6;
/** Weeks actually worked by a full-year employee (52 − 5.6 weeks holiday). */
const FULL_YEAR_WORKING_WEEKS = 46.4;

export function calculateHoliday(
  workingDays: WorkingDay[],
  contractType: ContractType,
  weeksPerYear: string,
  week2Days?: WorkingDay[] | null,
): HolidayCalculation {
  const weeks = week2Days ? [workingDays, week2Days] : [workingDays];
  const sumDays = weeks.reduce((t, w) => t + w.filter((d) => d.enabled).length, 0);
  const sumHours = weeks.reduce(
    (t, w) => t + w.filter((d) => d.enabled).reduce((h, d) => h + workingDayHours(d), 0),
    0,
  );
  // Two-week rotas are averaged per week so holiday is pro-rated correctly.
  const workingDaysPerWeek = parseFloat((sumDays / weeks.length).toFixed(2));
  const weeklyHours = sumHours / weeks.length;

  const parsedWeeks = parseFloat(weeksPerYear ?? "");
  const weeksWorkedPerYear =
    Number.isFinite(parsedWeeks) && parsedWeeks > 0
      ? parsedWeeks
      : DEFAULT_WEEKS_PER_YEAR[contractType];

  const totalWeeksEntitlement =
    weeksWorkedPerYear >= FULL_YEAR_WORKING_WEEKS
      ? UK_STATUTORY_WEEKS
      : parseFloat(((UK_STATUTORY_WEEKS * weeksWorkedPerYear) / FULL_YEAR_WORKING_WEEKS).toFixed(2));

  const totalDaysEntitlement = parseFloat((totalWeeksEntitlement * workingDaysPerWeek).toFixed(1));
  const avgHoursPerDay = workingDaysPerWeek > 0 ? weeklyHours / workingDaysPerWeek : 0;
  const totalHoursEntitlement = parseFloat((totalDaysEntitlement * avgHoursPerDay).toFixed(1));

  return {
    totalWeeksEntitlement,
    totalDaysEntitlement,
    totalHoursEntitlement,
    weeklyHours,
    workingDaysPerWeek,
    weeksWorkedPerYear,
    contractType,
  };
}

/** Week-2 days when the agreement uses a two-week rolling rota, otherwise null. */
export function rotaWeek2(data: Pick<AgreementData, "rotaWeeks" | "workingDaysWeek2">) {
  return data.rotaWeeks === 2 ? data.workingDaysWeek2 : null;
}

export function holidayForAgreement(data: AgreementData): HolidayCalculation {
  return calculateHoliday(data.workingDays, data.contractType, data.weeksPerYear, rotaWeek2(data));
}

/** Which rota week (1 or 2) a given ISO date falls in, based on rotaStartDate. */
export function rotaWeekFor(dateIso: string, rotaStartDate: string): 1 | 2 {
  const start = new Date(`${rotaStartDate}T00:00:00Z`);
  const date = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(date.getTime())) return 1;
  const startMonday = start.getTime() - ((start.getUTCDay() + 6) % 7) * 86400000;
  const weeks = Math.floor((date.getTime() - startMonday) / (7 * 86400000));
  return ((weeks % 2) + 2) % 2 === 0 ? 1 : 2;
}

/** Format an ISO date string (YYYY-MM-DD) as e.g. "15 August 2026". */
export const formatUKDate = (iso: string, fallback = "___________________"): string => {
  if (!iso) return fallback;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export const defaultDuties: NannyDuty[] = [
  { id: "caring", label: "Caring for children", details: "", enabled: true },
  {
    id: "collecting",
    label: "Collecting children from school and transporting them home safely",
    details: "",
    enabled: true,
  },
  {
    id: "meals",
    label:
      "Helping to plan healthy nutritious meals and preparing the children's snacks and meals",
    details: "",
    enabled: true,
  },
  {
    id: "cooking",
    label:
      "Cooking family evening meals, ensuring the children eat a hot meal whilst sitting at the table and encouraging good table manners",
    details: "",
    enabled: true,
  },
  {
    id: "learning",
    label:
      "Encouraging the children's learning, including assisting with homework and recording this in their home-school handover book",
    details: "",
    enabled: true,
  },
  {
    id: "tidying",
    label:
      "Keeping children's area of the house clean and tidy – playroom, kitchen, bedrooms, bathroom and cloakroom",
    details: "",
    enabled: true,
  },
  {
    id: "bathtime",
    label: "Supervising children's bath-time and preparing them for bed with story time",
    details: "",
    enabled: true,
  },
  {
    id: "behaviour",
    label:
      "Using consistent behavioural management techniques, previously discussed and agreed with the employers and teaching good manners",
    details: "",
    enabled: true,
  },
  {
    id: "communication",
    label: "Communicating progress and daily activities with the Employer",
    details: "",
    enabled: true,
  },
  {
    id: "supervision",
    label:
      "Supervising the children at all times and only using public transport with children when agreed in advance with the Employer",
    details: "",
    enabled: true,
  },
  {
    id: "activities",
    label: "Organising age-appropriate, stimulating activities for the children",
    details: "",
    enabled: true,
  },
  { id: "interests", label: "Supporting the children's interests", details: "", enabled: true },
  {
    id: "playdates",
    label: "Hosting the occasional play-date with one of the children's friends",
    details: "",
    enabled: true,
  },
  {
    id: "medication",
    label: "Administering medication, such as Calpol, when required as agreed by the Employer",
    details: "",
    enabled: true,
  },
  {
    id: "laundry",
    label: "Helping with children's laundry; load washing machine, drying",
    details: "",
    enabled: true,
  },
];

export const defaultWorkingDays: WorkingDay[] = [
  { day: "Monday", enabled: false, startTime: "09:00", endTime: "17:00" },
  { day: "Tuesday", enabled: false, startTime: "09:00", endTime: "17:00" },
  { day: "Wednesday", enabled: false, startTime: "09:00", endTime: "17:00" },
  { day: "Thursday", enabled: false, startTime: "09:00", endTime: "17:00" },
  { day: "Friday", enabled: false, startTime: "09:00", endTime: "17:00" },
  { day: "Saturday", enabled: false, startTime: "09:00", endTime: "17:00" },
  { day: "Sunday", enabled: false, startTime: "09:00", endTime: "17:00" },
];

export const defaultAgreementData: AgreementData = {
  documentStyle: "full",
  statementBody: "",
  employerName: "",
  employerAddress: "",
  nannyName: "",

  jobTitle: "Nanny",
  workAddress: "",
  startDate: "",
  isFixedTerm: false,
  endDate: "",
  fixedTermReason: "",

  probationPeriod: "3 months",
  overtimePolicy:
    "Overtime is not paid; any additional hours required on an occasional basis will be taken as time off in lieu by prior agreement with the Employer.",

  duties: defaultDuties,
  otherDutiesClause:
    "The Nanny shall also perform any other reasonable duties as may from time to time be required by the Employer and which are consistent with the role of a Nanny.",

  workingDays: defaultWorkingDays,
  rotaWeeks: 1,
  workingDaysWeek2: defaultWorkingDays,
  rotaStartDate: "",
  contractType: "year-round",
  weeksPerYear: "52",
  includeWorkingPatternClause: true,
  allowSchoolHolidayWork: false,

  hourlyRate: "",
  rateBasis: "gross",
  includeTaxResponsibilityClause: true,
  paymentMethod: "Direct debit payment direct to the Nanny's bank",
  paymentFrequency: "Monthly (last day of each month)",
  benefits: "Light refreshments such as tea, coffee, soft drinks and fruit",
  expenseRate: "45",

  pension:
    "The Nanny will be auto-enrolled into the Employer's workplace pension scheme in line with the Pensions Act 2008, subject to the relevant qualifying criteria. The Nanny may opt out in accordance with the scheme rules.",

  includeHolidayEntitlement: true,
  holidayAllowance: "",
  rolledUpHolidayPay: false,

  sicknessPolicy:
    "If the Nanny is unable to attend work due to sickness or injury they shall (insofar as they are able) promptly notify the Employer either in person or by telephone (as appropriate) on the first day of absence. The Employer may require a doctor's certificate after seven consecutive days of sickness. Statutory Sick Pay will be paid in accordance with the law.",

  grievanceProcedure:
    "Any grievance relating to the employment should first be raised informally with the Employer. If the matter is not resolved, the Nanny should set out the grievance in writing and the Employer will arrange a meeting to discuss it. A formal procedure is available on request, in line with the ACAS Code of Practice.",
  disciplinaryProcedure:
    "The Employer will follow a fair disciplinary procedure consistent with the ACAS Code of Practice. In the first instance any concerns will be discussed informally. Where a formal process is required, the Nanny will be informed of the nature of the concern in writing and given the opportunity to respond before any decision is made.",
  dataProtection:
    "The Employer will process the Nanny's personal data in accordance with the General Data Protection Regulation (GDPR) and the Data Protection Act 2018. Personal data will be kept confidential and used only for the purposes of administering the employment relationship.",
  dbsChecked:
    "The Nanny confirms that an enhanced Disclosure and Barring Service (DBS) check has been carried out. The Employer will retain a copy of the certificate on file.",
  references:
    "The Nanny has provided two satisfactory references which the Employer has taken up and verified prior to the commencement of employment.",
  gardenLeave:
    "During any notice period, the Employer may require the Nanny not to attend work (garden leave) while remaining employed and entitled to full pay and benefits.",

  probationNotice: "1 week",
  standardNotice: "4 weeks",
};

const CONTRACT_TYPES: ContractType[] = ["year-round", "term-time", "part-time-term-time"];

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}

/** Coerce anything stored in the database into a complete, safe AgreementData. */
export function normalizeAgreement(raw: unknown): AgreementData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const base = defaultAgreementData;

  const duties = Array.isArray(r["duties"])
    ? (r["duties"] as Record<string, unknown>[]).map((d, i) => ({
        id: str(d["id"], `duty-${i}`),
        label: str(d["label"]).slice(0, 400),
        details: str(d["details"]).slice(0, 1000),
        enabled: d["enabled"] !== false,
      }))
    : base.duties.map((d) => ({ ...d }));

  const parseDays = (value: unknown): WorkingDay[] =>
    Array.isArray(value)
      ? (value as Record<string, unknown>[]).map((d, i) => {
          const day: WorkingDay = {
            day: str(d["day"], base.workingDays[i]?.day ?? "Day"),
            enabled: d["enabled"] === true,
            startTime: str(d["startTime"], "09:00"),
            endTime: str(d["endTime"], "17:00"),
          };
          if (d["startTime2"] && d["endTime2"]) {
            day.startTime2 = str(d["startTime2"]);
            day.endTime2 = str(d["endTime2"]);
          }
          return day;
        })
      : base.workingDays.map((d) => ({ ...d }));
  const workingDays = parseDays(r["workingDays"]);
  const workingDaysWeek2 = parseDays(r["workingDaysWeek2"]);

  const contractTypeRaw = str(r["contractType"], base.contractType) as ContractType;
  const contractType = CONTRACT_TYPES.includes(contractTypeRaw) ? contractTypeRaw : "year-round";

  const text = (key: keyof AgreementData) => str(r[key], "");

  return {
    documentStyle: str(r["documentStyle"], "full") === "statement" ? "statement" : "full",
    statementBody: str(r["statementBody"]).slice(0, 20000),
    employerName: text("employerName"),
    employerAddress: text("employerAddress"),
    nannyName: text("nannyName"),
    jobTitle: str(r["jobTitle"], "Nanny"),
    workAddress: text("workAddress"),
    startDate: text("startDate"),
    isFixedTerm: r["isFixedTerm"] === true,
    endDate: text("endDate"),
    fixedTermReason: text("fixedTermReason"),
    probationPeriod: text("probationPeriod"),
    overtimePolicy: text("overtimePolicy"),
    duties,
    otherDutiesClause: text("otherDutiesClause"),
    workingDays,
    rotaWeeks: r["rotaWeeks"] === 2 ? 2 : 1,
    workingDaysWeek2,
    rotaStartDate: str(r["rotaStartDate"]).slice(0, 10),
    contractType,
    weeksPerYear: str(r["weeksPerYear"], String(DEFAULT_WEEKS_PER_YEAR[contractType])),
    includeWorkingPatternClause: r["includeWorkingPatternClause"] !== false,
    allowSchoolHolidayWork: r["allowSchoolHolidayWork"] === true,
    hourlyRate: text("hourlyRate"),
    rateBasis: str(r["rateBasis"], "gross") === "net" ? "net" : "gross",
    includeTaxResponsibilityClause: r["includeTaxResponsibilityClause"] !== false,
    paymentMethod: text("paymentMethod"),
    paymentFrequency: text("paymentFrequency"),
    benefits: text("benefits"),
    expenseRate: text("expenseRate"),
    pension: text("pension"),
    includeHolidayEntitlement: r["includeHolidayEntitlement"] !== false,
    holidayAllowance: text("holidayAllowance"),
    rolledUpHolidayPay: r["rolledUpHolidayPay"] === true,
    sicknessPolicy: text("sicknessPolicy"),
    grievanceProcedure: text("grievanceProcedure"),
    disciplinaryProcedure: text("disciplinaryProcedure"),
    dataProtection: text("dataProtection"),
    dbsChecked: text("dbsChecked"),
    references: text("references"),
    gardenLeave: text("gardenLeave"),
    probationNotice: text("probationNotice"),
    standardNotice: text("standardNotice"),
  };
}

/** True when enough has been written for the agreement to be worth showing. */
export function agreementHasContent(data: AgreementData): boolean {
  return Boolean(
    data.statementBody.trim() ||
      data.employerName ||
      data.nannyName ||
      data.workAddress ||
      data.hourlyRate ||
      data.startDate ||
      data.workingDays.some((d) => d.enabled) ||
      (data.rotaWeeks === 2 && data.workingDaysWeek2.some((d) => d.enabled)),
  );
}
