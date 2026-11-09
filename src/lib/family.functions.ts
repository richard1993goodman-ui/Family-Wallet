import { createServerFn } from "@tanstack/react-start";

import type { ChildInput, ProfileInput } from "./family.types";

export const getFamilyProfile = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadFamilyProfile } = await import("./family.server");
    return loadFamilyProfile(data.slug);
  });

export const saveProfileFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; profile: ProfileInput }) => data)
  .handler(async ({ data }) => {
    const { saveFamilyProfile } = await import("./family.server");
    await saveFamilyProfile(data.slug, data.profile);
    return { ok: true as const };
  });

export const saveEmergencyProfileFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      slug: string;
      homeAddress?: string;
      gpDetails?: string;
      medicalNotes?: string;
      emergencyInstructions?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { saveEmergencyProfile } = await import("./family.server");
    await saveEmergencyProfile(data.slug, data);
    return { ok: true as const };
  });

export const addFamilyContactFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; name: string; relationship?: string; phone: string }) => data)
  .handler(async ({ data }) => {
    const { addFamilyContact } = await import("./family.server");
    await addFamilyContact(data.slug, data);
    return { ok: true as const };
  });

export const deleteFamilyContactFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteFamilyContact } = await import("./family.server");
    await deleteFamilyContact(data.slug, data.id);
    return { ok: true as const };
  });

export const updateFamilyContactFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { slug: string; id: string; name: string; relationship?: string; phone: string }) => data,
  )
  .handler(async ({ data }) => {
    const { updateFamilyContact } = await import("./family.server");
    await updateFamilyContact(data.slug, data);
    return { ok: true as const };
  });

export const saveNannyEmergencyFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      slug: string;
      nannyId: string;
      name?: string;
      relationship?: string;
      phone?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { saveNannyEmergencyContact } = await import("./family.server");
    await saveNannyEmergencyContact(data.slug, data);
    return { ok: true as const };
  });

export const saveChildFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; child: ChildInput }) => data)
  .handler(async ({ data }) => {
    const { saveChild } = await import("./family.server");
    return saveChild(data.slug, data.child);
  });

export const deleteChildFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteChild } = await import("./family.server");
    await deleteChild(data.slug, data.id);
    return { ok: true as const };
  });

export const uploadChildPhotoFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      slug: string;
      childId: string;
      fileName: string;
      contentType: string;
      base64: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { uploadChildPhoto } = await import("./family.server");
    await uploadChildPhoto(data.slug, data.childId, data.fileName, data.contentType, data.base64);
    return { ok: true as const };
  });

export const getPlanner = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; weekStart: string }) => data)
  .handler(async ({ data }) => {
    const { loadPlanner } = await import("./family.server");
    return loadPlanner(data.slug, data.weekStart);
  });

export const addPlannerEntryFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      slug: string;
      entryDate: string;
      timeLabel?: string;
      endTimeLabel?: string;
      title: string;
      childName?: string;
      entryType?: string;
      status?: string;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { addPlannerEntry } = await import("./family.server");
    await addPlannerEntry(data.slug, data);
    return { ok: true as const };
  });

export const deletePlannerEntryFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deletePlannerEntry } = await import("./family.server");
    await deletePlannerEntry(data.slug, data.id);
    return { ok: true as const };
  });

export const copyPreviousWeekFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; weekStart: string }) => data)
  .handler(async ({ data }) => {
    const { copyPreviousWeek } = await import("./family.server");
    return copyPreviousWeek(data.slug, data.weekStart);
  });

export const getMonth = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; month: string }) => data)
  .handler(async ({ data }) => {
    const { loadMonth } = await import("./family.server");
    return loadMonth(data.slug, data.month);
  });

export const getLogs = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadLogs } = await import("./family.server");
    return loadLogs(data.slug);
  });

export const addLogFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      slug: string;
      logDate: string;
      activities?: string;
      food?: string;
      homework?: string;
      mood?: string;
      notes?: string;
      tomorrow?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { addLog } = await import("./family.server");
    await addLog(data.slug, data);
    return { ok: true as const };
  });

export const deleteLogFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteLog } = await import("./family.server");
    await deleteLog(data.slug, data.id);
    return { ok: true as const };
  });

export const getSupport = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadSupport } = await import("./family.server");
    return loadSupport(data.slug);
  });

export const askSupportFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; subject: string; body: string }) => data)
  .handler(async ({ data }) => {
    const { askSupport } = await import("./family.server");
    return askSupport(data.slug, data.subject, data.body);
  });

export const replyAsFamilyFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; threadId: string; body: string }) => data)
  .handler(async ({ data }) => {
    const { replyAsFamily } = await import("./family.server");
    await replyAsFamily(data.slug, data.threadId, data.body);
    return { ok: true as const };
  });

export const markThreadReadFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; threadId: string }) => data)
  .handler(async ({ data }) => {
    const { markThreadRead } = await import("./family.server");
    await markThreadRead(data.slug, data.threadId);
    return { ok: true as const };
  });

export const getHubSummary = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadHubSummary } = await import("./family.server");
    return loadHubSummary(data.slug);
  });

export const getEmergencyCard = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadEmergencyCard } = await import("./family.server");
    return loadEmergencyCard(data.slug);
  });
