import { createServerFn } from "@tanstack/react-start";

import type { ExpenseInput, HandoverInput, PassportInput } from "./passport-handover.types";

export const getPassport = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadPassport } = await import("./passport-handover.server");
    return loadPassport(data.slug);
  });

export const addPassportEntryFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; entry: PassportInput }) => data)
  .handler(async ({ data }) => {
    const { addPassportEntry } = await import("./passport-handover.server");
    return addPassportEntry(data.slug, data.entry);
  });

export const deletePassportEntryFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deletePassportEntry } = await import("./passport-handover.server");
    await deletePassportEntry(data.slug, data.id);
    return { ok: true as const };
  });

export const getHandover = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadHandover } = await import("./passport-handover.server");
    return loadHandover(data.slug);
  });

export const saveHandoverFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; handover: HandoverInput }) => data)
  .handler(async ({ data }) => {
    const { saveHandover } = await import("./passport-handover.server");
    return saveHandover(data.slug, data.handover);
  });

export const deleteHandoverFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteHandover } = await import("./passport-handover.server");
    await deleteHandover(data.slug, data.id);
    return { ok: true as const };
  });

export const addExpenseFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; expense: ExpenseInput }) => data)
  .handler(async ({ data }) => {
    const { addExpense } = await import("./passport-handover.server");
    return addExpense(data.slug, data.expense);
  });

export const reviewExpenseFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string; status: "reimbursed" | "declined" }) => data)
  .handler(async ({ data }) => {
    const { reviewExpense } = await import("./passport-handover.server");
    await reviewExpense(data.slug, data.id, data.status);
    return { ok: true as const };
  });

export const deleteExpenseFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteExpense } = await import("./passport-handover.server");
    await deleteExpense(data.slug, data.id);
    return { ok: true as const };
  });
