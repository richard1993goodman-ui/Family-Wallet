import { describe, expect, it } from "vitest";
import { COUNTRIES, countryConfig, isCountryEnabled, isValidPostcode } from "./countries";
import { keyDatesFor, providerFor } from "./holidays";
import { bankHolidays, keyDatePresets } from "./work-hours";

describe("public holiday providers", () => {
  it("gives a UK household with no region exactly the England dates it had before", () => {
    const today = new Date("2026-11-11T12:00:00Z");
    expect(keyDatesFor("GB", null, today).dates).toEqual(keyDatePresets(today));
    expect(keyDatesFor("GB", null, today).configured).toBe(true);
  });

  it("treats England and Wales as set up, whatever the capitalisation", () => {
    expect(providerFor("gb", "England")?.id).toBe("gb-eng");
    expect(providerFor("GB", "wales")?.id).toBe("gb-eng");
  });

  it("does not guess Scotland or Northern Ireland, whose dates differ", () => {
    expect(providerFor("GB", "Scotland")).toBeNull();
    expect(providerFor("GB", "Northern Ireland")).toBeNull();
    expect(keyDatesFor("GB", "Scotland")).toMatchObject({ configured: false, dates: [] });
  });

  it("never shows another country's holidays as a household's own", () => {
    for (const country of ["IE", "FR", "AE", "US", "", null, undefined]) {
      expect(keyDatesFor(country, null)).toMatchObject({ configured: false, dates: [] });
    }
  });

  it("only offers dates from today onwards", () => {
    const dates = keyDatesFor("GB", null, new Date("2026-11-11T12:00:00Z")).dates;
    expect(dates.every((d) => d.end >= "2026-11-11")).toBe(true);
    expect(dates.some((d) => d.label === "Christmas Day")).toBe(true);
  });

  it("keeps the England calculation itself intact", () => {
    expect(bankHolidays(2026).map((d) => d.label)).toContain("Good Friday");
  });
});

describe("country registry", () => {
  it("has only the UK, and no country can be live by accident", () => {
    expect(Object.keys(COUNTRIES)).toEqual(["GB"]);
    expect(isCountryEnabled("GB")).toBe(true);
    expect(isCountryEnabled("IE")).toBe(false);
    expect(countryConfig("gb")?.currency).toBe("GBP");
  });

  it("checks UK postcodes in their usual shapes", () => {
    for (const ok of ["SW1A 1AA", "sw1a1aa", "M1 1AE", "B33 8TH", "CR2 6XH", "DN55 1PT"])
      expect(isValidPostcode("GB", ok)).toBe(true);
    for (const bad of ["", "12345", "SW1A", "ABCDE FGH"])
      expect(isValidPostcode("GB", bad)).toBe(false);
  });

  it("accepts any value where no postcode rule is configured, rather than rejecting real addresses", () => {
    expect(isValidPostcode("FR", "75001")).toBeNull();
    expect(isValidPostcode(null, "anything")).toBeNull();
  });
});
