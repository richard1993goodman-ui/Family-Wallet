import { describe, expect, it } from "vitest";
import { defaultWorkingDays, type WorkingDay } from "./agreement.model";
import { navFor } from "../components/wallet-nav";
import {
  cleanSchedule,
  cleanWorkingDays,
  effectiveWorkingDays,
  hasHours,
  offPeriodOn,
  regularHoursApply,
  weeklyHours,
} from "./work-hours";

const mon = (enabled = true): WorkingDay[] =>
  defaultWorkingDays.map((d) =>
    d.day === "Monday" ? { ...d, enabled, startTime: "08:00", endTime: "16:30" } : d,
  );

describe("cleanWorkingDays", () => {
  it("always returns seven days, Monday first, with only the given days on", () => {
    const days = cleanWorkingDays([
      { day: "Wednesday", enabled: true, startTime: "07:30", endTime: "18:00" },
    ]);
    expect(days.map((d) => d.day)).toEqual(defaultWorkingDays.map((d) => d.day));
    expect(days.filter((d) => d.enabled).map((d) => d.day)).toEqual(["Wednesday"]);
    expect(weeklyHours(days)).toBe(10.5);
  });
  it("rejects bad or backwards times on a working day", () => {
    expect(() =>
      cleanWorkingDays([{ day: "Monday", enabled: true, startTime: "9am", endTime: "17:00" }]),
    ).toThrow("Monday");
    expect(() =>
      cleanWorkingDays([{ day: "Friday", enabled: true, startTime: "17:00", endTime: "09:00" }]),
    ).toThrow("Friday");
  });
  it("keeps a split shift and counts both blocks", () => {
    const days = cleanWorkingDays([
      { day: "Monday", enabled: true, startTime: "07:00", endTime: "09:00", startTime2: "15:00", endTime2: "19:00" },
    ]);
    expect(days[0]?.startTime2).toBe("15:00");
    expect(weeklyHours(days)).toBe(6);
  });
  it("rejects a second shift that overlaps the first", () => {
    expect(() =>
      cleanWorkingDays([{ day: "Monday", enabled: true, startTime: "07:00", endTime: "16:00", startTime2: "15:00", endTime2: "19:00" }]),
    ).toThrow("Monday");
  });
  it("ignores the times on a day that is switched off, and non-lists", () => {
    expect(
      cleanWorkingDays([
        { day: "Monday", enabled: false, startTime: "nonsense", endTime: "x" },
      ]).some((d) => d.enabled),
    ).toBe(false);
    expect(hasHours(cleanWorkingDays("rubbish"))).toBe(false);
  });
});

describe("effectiveWorkingDays", () => {
  const agreement = mon();
  const typed = cleanWorkingDays([
    { day: "Tuesday", enabled: true, startTime: "09:00", endTime: "17:00" },
  ]);
  it("uses the agreement's days when the agreement is on and has some", () => {
    expect(effectiveWorkingDays(true, agreement, typed)).toBe(agreement);
  });
  it("uses typed hours when the agreement is off", () => {
    expect(effectiveWorkingDays(false, agreement, typed)).toBe(typed);
  });
  it("uses typed hours when the agreement exists but has no days", () => {
    expect(effectiveWorkingDays(true, mon(false), typed)).toBe(typed);
  });
  it("falls back to the agreement when nothing was typed", () => {
    expect(effectiveWorkingDays(false, agreement, null)).toBe(agreement);
  });
});

describe("navFor", () => {
  const hasAgreement = (agreements: boolean, role: "family" | "nanny") =>
    navFor(role, agreements).some((s) => s.items.some((i) => i.to === "/agreement/$slug"));
  it("hides the agreement page when it is off, for both roles, but keeps working hours", () => {
    for (const role of ["family", "nanny"] as const) {
      expect(hasAgreement(true, role)).toBe(true);
      expect(hasAgreement(false, role)).toBe(false);
      expect(navFor(role, false).some((s) => s.items.some((i) => i.to === "/hours/$slug"))).toBe(
        true,
      );
    }
  });
});

describe("cleanSchedule", () => {
  it("defaults to full time, repeating every week, nothing off", () => {
    expect(cleanSchedule(undefined)).toEqual({
      arrangement: "full_time",
      repeat: true,
      onlyWeek: null,
      offPeriods: [],
      hoursSource: "agreement",
    });
  });
  it("remembers when a parent chose their own shift pattern", () => {
    expect(cleanSchedule({ hoursSource: "manual" }).hoursSource).toBe("manual");
    expect(cleanSchedule({ hoursSource: "nonsense" }).hoursSource).toBe("agreement");
  });
  it("sorts holidays and finds the one covering a date", () => {
    const s = cleanSchedule({
      arrangement: "term_time",
      offPeriods: [
        { label: "Summer", start: "2027-07-26", end: "2027-09-03" },
        { label: "Inset day", start: "2027-01-04", end: "2027-01-04" },
      ],
    });
    expect(s.offPeriods[0]?.label).toBe("Inset day");
    expect(offPeriodOn(s, "2027-08-10")?.label).toBe("Summer");
    expect(offPeriodOn(s, "2027-01-05")).toBeNull();
  });
  it("applies one week only when repeat is off, using that week's Monday", () => {
    const s = cleanSchedule({ repeat: false, onlyWeek: "2027-03-03" });
    expect(s.onlyWeek).toBe("2027-03-01");
    expect(regularHoursApply(s, "2027-03-05")).toBe(true);
    expect(regularHoursApply(s, "2027-03-08")).toBe(false);
  });
  it("rejects bad dates and a missing week", () => {
    expect(() =>
      cleanSchedule({ offPeriods: [{ label: "x", start: "soon", end: "2027-01-01" }] }),
    ).toThrow("x");
    expect(() =>
      cleanSchedule({ offPeriods: [{ label: "x", start: "2027-02-02", end: "2027-02-01" }] }),
    ).toThrow("x");
    expect(() => cleanSchedule({ repeat: false })).toThrow("week");
  });
});

import { bankHolidays, easterSunday, keyDatePresets } from "./work-hours";

describe("key dates", () => {
  it("finds Easter", () => {
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(easterSunday(2027).toISOString().slice(0, 10)).toBe("2027-03-28");
  });

  it("lists the 2026 bank holidays, moving Boxing Day to the substitute Monday", () => {
    const byName = Object.fromEntries(bankHolidays(2026).map((p) => [p.label, p.start]));
    expect(byName["New Year's Day"]).toBe("2026-01-01");
    expect(byName["Good Friday"]).toBe("2026-04-03");
    expect(byName["Easter Monday"]).toBe("2026-04-06");
    expect(byName["Early May bank holiday"]).toBe("2026-05-04");
    expect(byName["Spring bank holiday"]).toBe("2026-05-25");
    expect(byName["Summer bank holiday"]).toBe("2026-08-31");
    expect(byName["Christmas Day"]).toBe("2026-12-25");
    expect(byName["Boxing Day"]).toBe("2026-12-28");
  });

  it("moves a weekend New Year's Day and Christmas to the weekdays that follow", () => {
    const y2022 = Object.fromEntries(bankHolidays(2022).map((p) => [p.label, p.start]));
    expect(y2022["New Year's Day"]).toBe("2022-01-03");
    expect(y2022["Christmas Day"]).toBe("2022-12-27");
    expect(y2022["Boxing Day"]).toBe("2022-12-26");
  });

  it("only offers dates still to come", () => {
    const upcoming = keyDatePresets(new Date(Date.UTC(2026, 11, 1)));
    expect(upcoming[0]!.start >= "2026-12-01").toBe(true);
    expect(upcoming.some((p) => p.label === "Christmas Day" && p.start === "2026-12-25")).toBe(true);
  });
});

describe("hours source", () => {
  const agreement = [{ day: "Monday", enabled: true, startTime: "08:00", endTime: "16:00" }];
  const manual = [{ day: "Monday", enabled: true, startTime: "07:00", endTime: "09:00", startTime2: "15:00", endTime2: "19:00" }];

  it("uses the agreement's hours by default", () => {
    expect(effectiveWorkingDays(true, agreement as never, manual as never, { hoursSource: "agreement" })).toBe(agreement);
  });
  it("uses the parent's own shift pattern when they chose it", () => {
    expect(effectiveWorkingDays(true, agreement as never, manual as never, { hoursSource: "manual" })).toBe(manual);
  });
  it("falls back to the agreement if the manual pattern is empty", () => {
    const empty = [{ day: "Monday", enabled: false, startTime: "09:00", endTime: "17:00" }];
    expect(effectiveWorkingDays(true, agreement as never, empty as never, { hoursSource: "manual" })).toBe(agreement);
  });
});
