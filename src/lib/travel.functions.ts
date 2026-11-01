import { createServerFn } from "@tanstack/react-start";

import type { TripInput } from "./travel.types";

export const getTravel = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadTravel } = await import("./travel.server");
    return loadTravel(data.slug);
  });

export const saveTripFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; trip: TripInput }) => data)
  .handler(async ({ data }) => {
    const { saveTrip } = await import("./travel.server");
    return saveTrip(data.slug, data.trip);
  });

export const updateChecklistFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      slug: string;
      tripId: string;
      action: { type: "toggle"; itemId: string } | { type: "add"; label: string } | { type: "remove"; itemId: string };
    }) => data,
  )
  .handler(async ({ data }) => {
    const { updateChecklist } = await import("./travel.server");
    return updateChecklist(data.slug, data.tripId, data.action);
  });

export const addTravelNoteFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; tripId: string; category: string; text: string }) => data)
  .handler(async ({ data }) => {
    const { addTravelNote } = await import("./travel.server");
    return addTravelNote(data.slug, data.tripId, { category: data.category, text: data.text });
  });

export const deleteTripFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; tripId: string }) => data)
  .handler(async ({ data }) => {
    const { deleteTrip } = await import("./travel.server");
    return deleteTrip(data.slug, data.tripId);
  });
