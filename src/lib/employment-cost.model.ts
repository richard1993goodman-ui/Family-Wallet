export type EmploymentCostInput = {
  hourlyRate: number;
  hoursPerWeek: number;
  workingWeeks: number;
  employerNiRate: number;
  pensionRate: number;
  monthlyPayrollFee: number;
  annualExtras: number;
};

export function calculateEmploymentCost(input: EmploymentCostInput) {
  const hourlyRate = Math.max(0, input.hourlyRate || 0);
  const hoursPerWeek = Math.max(0, input.hoursPerWeek || 0);
  const workingWeeks = Math.min(52, Math.max(1, input.workingWeeks || 52));
  const annualHours = hoursPerWeek * workingWeeks;
  const grossPay = hourlyRate * annualHours;
  const employerNi = grossPay * Math.max(0, input.employerNiRate || 0) / 100;
  const pension = grossPay * Math.max(0, input.pensionRate || 0) / 100;
  const payroll = Math.max(0, input.monthlyPayrollFee || 0) * 12;
  const extras = Math.max(0, input.annualExtras || 0);
  const annualTotal = grossPay + employerNi + pension + payroll + extras;
  return {
    annualHours,
    grossPay,
    employerNi,
    pension,
    payroll,
    extras,
    annualTotal,
    monthlyTotal: annualTotal / 12,
    weeklyTotal: annualTotal / workingWeeks,
    allInHourly: annualHours ? annualTotal / annualHours : 0,
  };
}