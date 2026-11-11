import { describe, expect, it } from "vitest";
import { buildTimeline, minutesOf, parseClock, routineItems, summariseDay, type TimelineInput } from "./today-timeline";

const empty: TimelineInput = { now: "16:30", shift: null, scheduled: { start: "15:00", end: "19:30" }, planner: [], routines: [], care: [], doses: [], photos: [] };

describe("clock parsing", () => {
  it("reads 12 and 24 hour times", () => {
    expect(parseClock("3:15pm")).toBe("15:15");
    expect(parseClock("7pm")).toBe("19:00");
    expect(parseClock("12am")).toBe("00:00");
    expect(parseClock("15:15")).toBe("15:15");
    expect(parseClock("tea time")).toBeNull();
    expect(parseClock("25:00")).toBeNull();
  });
});

describe("routine prompts from the children's profiles", () => {
  const kids = [
    { name: "Oscar", school_hours: "8:45am – 3:15pm", bedtime_routine: "Bath 7pm, reading, lights out 7:45pm" },
    { name: "Leo", school_hours: "8:45am – 3:15pm", bedtime_routine: "Bath 6:45pm, two stories, lights out 7:15pm" },
  ];
  it("collects children with the same finish time in one prompt", () => {
    const items = routineItems(kids, "19:30");
    expect(items.filter((i) => i.title.startsWith("Collect"))).toEqual([expect.objectContaining({ at: "15:15", title: "Collect Oscar and Leo from school" })]);
  });
  it("adds the evening routine that falls inside the shift, and nothing after it", () => {
    const titles = routineItems(kids, "19:30").map((i) => `${i.childName ?? ""}${i.at}`);
    expect(titles).toContain("Oscar19:00");
    expect(titles).toContain("Leo18:45");
    expect(titles).not.toContain("Oscar19:45"); // lights out after the shift ends
  });
});

describe("timeline", () => {
  it("orders by time, puts untimed items first and marks the next thing", () => {
    const items = buildTimeline({
      ...empty,
      planner: [
        { id: "a", time_label: "17:00", end_time_label: null, title: "Football", child_name: "Oscar", entry_type: "activity", status: "active" },
        { id: "b", time_label: null, end_time_label: null, title: "PE kit in the bag", child_name: null, entry_type: "note", status: "active" },
      ],
      routines: [{ id: "r1", at: "15:15", kind: "routine", title: "Collect from school" }],
    });
    expect(items.map((i) => i.title)).toEqual(["PE kit in the bag", "Shift starts", "Collect from school", "Football"]);
    expect(items.find((i) => i.title === "Football")!.state).toBe("next");
    expect(items.find((i) => i.title === "Collect from school")!.state).toBe("done");
  });

  it("shows logged things and photos as done at the time they happened", () => {
    const items = buildTimeline({
      ...empty,
      shift: { startedAt: "15:02", endedAt: null },
      care: [{ id: "c1", kind: "meal", detail: "Snack", amountMl: null, childName: "Leo", at: "15:40" }],
      photos: [{ id: "p1", caption: "Colouring", childName: "Leo", photoUrl: "/x.jpg", at: "16:05" }],
    });
    expect(items.map((i) => i.title)).toEqual(["Shift started", "Meal: Snack", "Colouring", "Shift due to end"]);
    expect(items.filter((i) => i.state === "done")).toHaveLength(3);
  });

  it("keeps the next safe medicine time in view", () => {
    const items = buildTimeline({
      ...empty,
      doses: [{ id: "d1", medicine: "Calpol (paracetamol)", dose: "5ml", childName: "Oscar", at: "16:10", nextDoseFrom: "2026-11-11T20:10:00Z", nextAt: "20:10" }],
      now: "16:30",
    });
    expect(items.some((i) => i.title === "Calpol given" && i.state === "done")).toBe(true);
    expect(items.find((i) => i.title.startsWith("Next Calpol"))).toMatchObject({ at: "20:10", attention: true });
  });

  it("flags a shift change that is waiting for approval and hides declined ones", () => {
    const items = buildTimeline({
      ...empty,
      planner: [
        { id: "x", time_label: "16:30", end_time_label: "20:00", title: "Changed nanny shift", child_name: null, entry_type: "shift_change", status: "active", approval: "pending" },
        { id: "y", time_label: "17:00", end_time_label: null, title: "Changed nanny shift", child_name: null, entry_type: "shift_change", status: "active", approval: "declined" },
      ],
    });
    const change = items.find((i) => i.title === "Shift changed")!;
    expect(change.attention).toBe(true);
    expect(change.detail).toContain("Waiting for approval");
    expect(items.filter((i) => i.title === "Shift changed")).toHaveLength(1);
  });

  it("leaves out entries that are already on the timesheet", () => {
    const items = buildTimeline({ ...empty, planner: [{ id: "s", time_label: "15:00", end_time_label: "19:00", title: "Nanny shift", child_name: null, entry_type: "shift", status: "active" }] });
    expect(items.some((i) => i.title === "Nanny shift")).toBe(false);
  });
});

describe("end-of-day summary", () => {
  it("tells parents how long the shift was and what was done", () => {
    const timeline = buildTimeline({
      ...empty,
      shift: { startedAt: "15:02", endedAt: "19:28" },
      now: "19:30",
      care: [{ id: "c", kind: "meal", detail: "Dinner", amountMl: null, childName: null, at: "17:40" }],
      photos: [{ id: "p", caption: null, childName: null, photoUrl: null, at: "16:05" }, { id: "q", caption: null, childName: null, photoUrl: null, at: "16:50" }],
      doses: [{ id: "d", medicine: "Calpol", dose: null, childName: "Oscar", at: "16:10", nextDoseFrom: null, nextAt: null }],
    });
    const lines = summariseDay({ nannyName: "Jess", shift: { startedAt: "15:02", endedAt: "19:28", minutes: 266 }, timeline });
    expect(lines[0]).toBe("Jess finished at 19:28 after 4h 26m.");
    expect(lines).toContain("Meals logged: dinner.");
    expect(lines).toContain("2 photos shared.");
    expect(lines.some((l) => l.startsWith("Calpol given for Oscar at 16:10"))).toBe(true);
  });
  it("says so while the shift is still running", () => {
    expect(summariseDay({ nannyName: "Jess", shift: null, timeline: [] })[0]).toBe("Jess is on shift today.");
  });
});

describe("minutes", () => {
  it("converts HH:MM", () => expect(minutesOf("19:30")).toBe(1170));
});
