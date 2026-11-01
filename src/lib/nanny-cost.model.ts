// UK household employer planning estimates (2026/27 rates). Not payroll advice.
export const TAX = {
  personalAllowance: 12570,
  basicRateLimit: 50270,
  basicRate: 0.2,
  higherRate: 0.4,
  employeeNiMain: 0.08,
  employeeNiUpper: 0.02,
  employerNiRate: 0.15,
  employerNiThreshold: 5000,
  pensionTrigger: 10000,
  pensionLower: 6240,
  pensionUpper: 50270,
  employerPension: 0.03,
  employeePension: 0.05,
  rolledUpHoliday: 0.1207,
  vat: 0.2,
};

export const MEMBERSHIP_BY_DAYS: Record<number, { name: string; monthly: number }> = {
  1: { name: "Bronze", monthly: 50 },
  2: { name: "Silver", monthly: 70 },
  3: { name: "Silver", monthly: 80 },
  4: { name: "Gold", monthly: 100 },
  5: { name: "Gold", monthly: 120 },
  6: { name: "Platinum", monthly: 140 },
  7: { name: "Platinum", monthly: 140 },
};

export type CostInput = {
  rate: number;
  basis: "net" | "gross";
  hoursPerDay: number;
  daysPerWeek: number;
  pattern: "year-round" | "term-time";
  termWeeks: number;
  includeMembership: boolean;
  payrollMonthly: number;
};

function deductions(gross: number) {
  const taxable = Math.max(0, gross - TAX.personalAllowance);
  const basicBand = TAX.basicRateLimit - TAX.personalAllowance;
  const incomeTax = Math.min(taxable, basicBand) * TAX.basicRate + Math.max(0, taxable - basicBand) * TAX.higherRate;
  const niMain = Math.max(0, Math.min(gross, TAX.basicRateLimit) - TAX.personalAllowance);
  const employeeNi = niMain * TAX.employeeNiMain + Math.max(0, gross - TAX.basicRateLimit) * TAX.employeeNiUpper;
  const enrolled = gross >= TAX.pensionTrigger;
  const qualifying = enrolled ? Math.max(0, Math.min(gross, TAX.pensionUpper) - TAX.pensionLower) : 0;
  return { incomeTax, employeeNi, employeePension: qualifying * TAX.employeePension, employerPension: qualifying * TAX.employerPension };
}

export function netFromGross(gross: number) {
  const d = deductions(gross);
  return gross - d.incomeTax - d.employeeNi - d.employeePension;
}

/** Annual gross that yields the target annual take-home pay. */
export function grossFromNet(net: number) {
  let lo = net, hi = net * 2 + 1000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (netFromGross(mid) < net) lo = mid; else hi = mid;
  }
  return Math.round(hi * 100) / 100;
}

export function calculateNannyCost(input: CostInput) {
  const days = Math.min(7, Math.max(1, Math.round(input.daysPerWeek || 1)));
  const weeklyHours = Math.max(0, input.hoursPerDay || 0) * days;
  const termTime = input.pattern === "term-time";
  const weeks = termTime ? Math.min(52, Math.max(1, input.termWeeks || 38)) : 52;
  const holidayUplift = termTime ? 1 + TAX.rolledUpHoliday : 1;
  const annualRatePay = Math.max(0, input.rate || 0) * weeklyHours * weeks * holidayUplift;
  const grossPay = input.basis === "gross" ? annualRatePay : grossFromNet(annualRatePay);
  const d = deductions(grossPay);
  const netPay = grossPay - d.incomeTax - d.employeeNi - d.employeePension;
  const employerNi = Math.max(0, grossPay - TAX.employerNiThreshold) * TAX.employerNiRate;
  const tier = MEMBERSHIP_BY_DAYS[days]!;
  const membership = input.includeMembership ? tier.monthly * (1 + TAX.vat) * 12 : 0;
  const payroll = Math.max(0, input.payrollMonthly || 0) * 12;
  const annualTotal = grossPay + employerNi + d.employerPension + membership + payroll;
  const annualHours = weeklyHours * weeks;
  return {
    days, weeklyHours, weeks, tier,
    grossPay, netPay, incomeTax: d.incomeTax, employeeNi: d.employeeNi, employeePension: d.employeePension,
    employerNi, employerPension: d.employerPension, membership, payroll,
    annualTotal, monthlyTotal: annualTotal / 12, weeklyTotal: annualTotal / 52,
    allInHourly: annualHours ? annualTotal / annualHours : 0,
    grossHourly: annualHours ? grossPay / (annualHours * holidayUplift) : 0,
  };
}
