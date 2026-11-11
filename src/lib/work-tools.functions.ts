import { createServerFn } from "@tanstack/react-start";
import type { ActivityIdea, MealIdea, ResourceKind, ShiftInput } from "./work-tools.model";

export const generateActivityIdeasFn = createServerFn({ method: "POST" }).inputValidator((data: { slug: string; setting: string; minutes: number; energy: string; notes: string }) => data).handler(async ({ data }) => {
  const { generateActivityIdeas } = await import("./work-tools.server");
  return generateActivityIdeas(data.slug, data);
});

export const generateMealIdeasFn = createServerFn({ method: "POST" }).inputValidator((data: { slug: string; category: string; minutes: number; ingredients: string; notes: string }) => data).handler(async ({ data }) => {
  const { generateMealIdeas } = await import("./work-tools.server");
  return generateMealIdeas(data.slug, data);
});

export const getSavedResources = createServerFn({ method: "GET" }).inputValidator((data: { slug: string; kind: ResourceKind }) => data).handler(async ({ data }) => {
  const { listSavedResources } = await import("./work-tools.server");
  return listSavedResources(data.slug, data.kind);
});

export const saveResourceFn = createServerFn({ method: "POST" }).inputValidator((data: { slug: string; kind: ResourceKind; item: ActivityIdea | MealIdea }) => data).handler(async ({ data }) => {
  const { saveResource } = await import("./work-tools.server");
  return saveResource(data.slug, data.kind, data.item);
});

export const addResourceToCalendarFn = createServerFn({ method: "POST" }).inputValidator((data: { slug: string; resourceId: string; entryDate: string; timeLabel: string }) => data).handler(async ({ data }) => {
  const { addResourceToCalendar } = await import("./work-tools.server");
  await addResourceToCalendar(data.slug, data.resourceId, data.entryDate, data.timeLabel);
  return { ok: true as const };
});

export const getTimesheets = createServerFn({ method: "GET" }).inputValidator((data: { slug: string }) => data).handler(async ({ data }) => {
  const { loadTimesheets } = await import("./work-tools.server");
  return loadTimesheets(data.slug);
});

export const submitShiftFn = createServerFn({ method: "POST" }).inputValidator((data: { slug: string; shift: ShiftInput }) => data).handler(async ({ data }) => {
  const { submitShift } = await import("./work-tools.server");
  return submitShift(data.slug, data.shift);
});

export const reviewShiftFn = createServerFn({ method: "POST" }).inputValidator((data: { slug: string; id: string; status: "approved" | "declined" }) => data).handler(async ({ data }) => {
  const { reviewShift } = await import("./work-tools.server");
  await reviewShift(data.slug, data.id, data.status);
  return { ok: true as const };
});

export const getExpectedShifts = createServerFn({ method: "GET" }).inputValidator((data: { slug: string }) => data).handler(async ({ data }) => {
  const { loadExpectedShifts } = await import("./work-tools.server");
  return loadExpectedShifts(data.slug);
});
