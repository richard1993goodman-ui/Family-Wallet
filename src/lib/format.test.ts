import { afterEach, describe, expect, it } from "vitest";
import { formatDate, formatLocale, formatMoney, formatTime, setFormatLocale } from "./format";

describe("formatMoney", () => {
  it("shows pounds by default, exactly as before", () => {
    expect(formatMoney(12.5)).toBe("£12.50");
    expect(formatMoney(0)).toBe("£0.00");
  });
  it("groups thousands", () => expect(formatMoney(1234.5)).toBe("£1,234.50"));
  it("uses the currency's own symbol and decimals", () => {
    expect(formatMoney(12.5, "EUR")).toBe("€12.50");
    expect(formatMoney(1200, "JPY")).toContain("1,200");
    expect(formatMoney(1200, "JPY")).not.toContain(".");
  });
  it("never breaks a screen on missing, invalid or unknown input", () => {
    expect(formatMoney(null)).toBe("£0.00");
    expect(formatMoney(Number.NaN)).toBe("£0.00");
    expect(formatMoney(5, "NOT-A-CURRENCY")).toBe("£5.00");
  });
  it("shows negatives clearly", () => expect(formatMoney(-5)).toContain("5.00"));
});

describe("formatDate and formatTime", () => {
  it("shows a date-only value as that calendar day, in any time zone", () => {
    expect(
      formatDate(
        "2026-11-11",
        { day: "numeric", month: "short", year: "numeric" },
        "en-GB",
        "Pacific/Auckland",
      ),
    ).toBe("11 Nov 2026");
    expect(
      formatDate(
        "2026-11-11",
        { day: "numeric", month: "short", year: "numeric" },
        "en-GB",
        "America/Los_Angeles",
      ),
    ).toBe("11 Nov 2026");
  });
  it("shows a moment in the requested time zone", () => {
    const moment = "2026-11-11T23:30:00Z";
    expect(formatTime(moment, "en-GB", "Europe/London")).toBe("23:30");
    expect(formatTime(moment, "en-GB", "Asia/Dubai")).toBe("03:30");
  });
});

describe("the chosen language", () => {
  afterEach(() => setFormatLocale("en-GB"));

  it("changes how dates and money are shown everywhere, without each screen passing it in", () => {
    expect(formatDate("2026-11-11", { day: "numeric", month: "long" })).toBe("11 November");
    setFormatLocale("fr-FR");
    expect(formatDate("2026-11-11", { day: "numeric", month: "long" })).toBe("11 novembre");
    expect(formatMoney(1234.5, "EUR")).toContain("1");
    expect(formatLocale()).toBe("fr-FR");
  });

  it("shows the pseudo-language's dates and money in UK English", () => {
    setFormatLocale("pseudo");
    expect(formatLocale()).toBe("en-GB");
    expect(formatMoney(12.5)).toBe("£12.50");
  });

  it("lets a caller pin a time zone for a moment, and uses the device's own when none is given", () => {
    const moment = "2026-11-11T23:30:00Z";
    const options = { hour: "2-digit", minute: "2-digit" } as const;
    expect(formatDate(moment, { ...options, timeZone: "Asia/Dubai" }, "en-GB")).toBe("03:30");
    expect(formatDate(moment, options, "en-GB", "Europe/London")).toBe("23:30");
  });
});
