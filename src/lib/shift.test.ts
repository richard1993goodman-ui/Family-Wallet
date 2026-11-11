import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  level: "nanny" as "nanny" | "family",
  nannyId: "jess" as string | null,
  open: null as Record<string, unknown> | null,
  insertError: null as { code: string } | null,
  updated: [] as unknown[],
  submitted: [] as Record<string, unknown>[],
}));

vi.mock("./family.server", () => ({
  requireSharedFamily: async () => ({ id: "fam1", family_name: "Harrington", access: state.level }),
  loadNannySchedules: async () => [],
}));
vi.mock("./wallet.server", () => ({ sessionAccess: async () => ({ level: state.level, nannyId: state.nannyId }) }));
vi.mock("./notifications.server", () => ({ notifyOther: async () => undefined }));
vi.mock("./work-tools.server", () => ({
  submitShift: async (_slug: string, shift: Record<string, unknown>) => {
    state.submitted.push(shift);
    return { id: "line1" };
  },
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      let mode = "select";
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, is: () => q,
        insert: async () => ({ error: state.insertError }),
        update: (v: unknown) => { mode = "update"; state.updated.push(v); return q; },
        maybeSingle: async () => {
          if (table === "shift_sessions") return { data: state.open };
          if (table === "nanny_agreements") return { data: { agreement_data: { hourlyRate: "18" } } };
          return { data: null };
        },
        then: (resolve: (v: unknown) => void) => resolve({ error: null, data: mode }),
      };
      return q;
    },
  },
}));

import { endShift, startShift } from "./shift.server";

beforeEach(() => {
  state.level = "nanny";
  state.nannyId = "jess";
  state.open = null;
  state.insertError = null;
  state.updated = [];
  state.submitted = [];
});
afterEach(() => vi.useRealTimers());

describe("start and end shift", () => {
  it("only the nanny can start a shift", async () => {
    state.level = "family";
    state.nannyId = null;
    await expect(startShift("h")).rejects.toThrow("Only your nanny");
  });

  it("starts once, and says so if it is already running", async () => {
    await expect(startShift("h")).resolves.toEqual({ ok: true });
    state.insertError = { code: "23505" };
    await expect(startShift("h")).rejects.toThrow("already started");
  });

  it("refuses to end a shift that has not started", async () => {
    await expect(endShift("h", 0)).rejects.toThrow("no shift in progress");
  });

  it("ends the shift and writes a priced timesheet line in local time, for approval", async () => {
    // 15:02 to 19:28 UK summer time is 14:02 to 18:28 UTC.
    state.open = { id: "s1", started_at: "2026-06-10T14:02:00Z" };
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T18:28:00Z"));
    const result = await endShift("h", 30);
    expect(result).toEqual({ ok: true, minutes: 236 });
    expect(state.submitted[0]).toMatchObject({ shiftDate: "2026-06-10", startTime: "15:02", endTime: "19:28", breakMinutes: 30, hourlyRate: 18, isOvernight: false, shiftType: "nanny" });
    expect(state.updated.some((u) => (u as { timesheet_shift_id?: string }).timesheet_shift_id === "line1")).toBe(true);
  });

  it("will not record a shift shorter than the break", async () => {
    state.open = { id: "s1", started_at: "2026-06-10T18:00:00Z" };
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T18:10:00Z"));
    await expect(endShift("h", 30)).rejects.toThrow("too short");
    expect(state.submitted).toHaveLength(0);
  });
});
