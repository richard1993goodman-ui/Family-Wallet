import { describe, expect, it } from "vitest";
import { allergyNote, initials, monthApproved } from "./wallet-overview";

const shift = (over: Partial<Parameters<typeof monthApproved>[0][number]> = {}) => ({
  shift_date: "2026-11-03",
  start_time: "08:00",
  end_time: "18:00",
  break_minutes: 60,
  is_overnight: false,
  hourly_rate: 16,
  status: "approved",
  ...over,
});

describe("approved pay this month", () => {
  it("adds approved shifts in the month, after breaks, at each shift's rate", () => {
    const out = monthApproved(
      [shift(), shift({ shift_date: "2026-11-10", hourly_rate: "20", break_minutes: 0 })],
      "2026-11-12",
    );
    expect(out).toEqual({ hours: 19, amount: 9 * 16 + 10 * 20, count: 2 });
  });

  it("ignores pending or declined shifts and other months", () => {
    const out = monthApproved(
      [
        shift({ status: "pending" }),
        shift({ status: "declined" }),
        shift({ shift_date: "2026-10-30" }),
      ],
      "2026-11-12",
    );
    expect(out).toEqual({ hours: 0, amount: 0, count: 0 });
  });

  it("copes with an overnight shift and a missing rate", () => {
    const out = monthApproved(
      [
        shift({
          start_time: "22:00",
          end_time: "06:00",
          is_overnight: true,
          hourly_rate: null,
          break_minutes: null,
        }),
      ],
      "2026-11-12",
    );
    expect(out).toEqual({ hours: 8, amount: 0, count: 1 });
  });
});

describe("initials", () => {
  it("takes up to two words", () => {
    expect(initials("The Harringtons")).toBe("TH");
    expect(initials("Jess")).toBe("J");
    expect(initials("  sam  jane  doe ")).toBe("SJ");
  });
});

describe("a child's allergy note", () => {
  it("warns when something is listed, says none quietly, and stays silent when blank", () => {
    expect(allergyNote("Nuts, penicillin")).toEqual({ kind: "warn", text: "Nuts, penicillin" });
    expect(allergyNote("None known")).toEqual({ kind: "none", text: "None known" });
    expect(allergyNote("no")).toEqual({ kind: "none", text: "no" });
    expect(allergyNote("")).toBeNull();
    expect(allergyNote(null)).toBeNull();
  });

  it("does not mistake a real allergy that starts with a short word for none", () => {
    expect(allergyNote("Nothing serious, but dairy upsets him")).toEqual({
      kind: "warn",
      text: "Nothing serious, but dairy upsets him",
    });
  });
});
