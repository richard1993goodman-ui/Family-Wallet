import { describe, expect, it } from "vitest";
import { AFTER_SCHOOL_DAY, demoAvatarFor, demoMoments } from "./demo-photos";

describe("demo wallet photos", () => {
  it("finds a stock avatar from a first name", () => {
    expect(demoAvatarFor("Jess Carter")).toBe("/images/demo/jess.jpg");
    expect(demoAvatarFor("leo")).toBe("/images/demo/leo.jpg");
    expect(demoAvatarFor("Someone Else")).toBeNull();
    expect(demoAvatarFor(null)).toBeNull();
  });

  it("dates the after-school feed from today, newest first, with a photo on every post", () => {
    const today = new Date(Date.UTC(2026, 10, 11, 9, 0));
    const feed = demoMoments(today);
    expect(feed[0]!.momentDate).toBe("2026-11-11");
    expect(feed.some((m) => m.momentDate === "2026-11-10")).toBe(true);
    expect(feed.every((m) => m.kind === "photo" && m.photoUrl?.startsWith("/images/demo/"))).toBe(true);
    const created = feed.map((m) => m.createdAt);
    expect(created).toEqual([...created].sort().reverse());
    expect(feed.filter((m) => m.momentDate === "2026-11-11")).toHaveLength(AFTER_SCHOOL_DAY.length);
  });
});
