import { createServerFn } from "@tanstack/react-start";

import type { CheckinInput, CheckinKind } from "./checkin.types";

export const getCheckins = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadCheckins } = await import("./checkin.server");
    return loadCheckins(data.slug);
  });

export const saveCheckinFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; checkin: CheckinInput }) => data)
  .handler(async ({ data }) => {
    const { saveCheckin } = await import("./checkin.server");
    return saveCheckin(data.slug, data.checkin);
  });

export const deleteCheckinFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteCheckin } = await import("./checkin.server");
    await deleteCheckin(data.slug, data.id);
    return { ok: true as const };
  });

export const requestReviewCallFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      slug: string;
      checkinId?: string | undefined;
      kind: CheckinKind;
      notes?: string | undefined;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { requestReviewCall } = await import("./checkin.server");
    return requestReviewCall(data.slug, {
      checkinId: data.checkinId,
      kind: data.kind,
      notes: data.notes,
    });
  });
