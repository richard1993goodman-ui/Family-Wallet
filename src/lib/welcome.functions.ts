import { createServerFn } from "@tanstack/react-start";

import { validateFirst48Input, type First48Input, type WelcomeStepId } from "./welcome.types";

export const getWelcome = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadWelcome } = await import("./welcome.server");
    return loadWelcome(data.slug);
  });

export const setWelcomeStepFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; stepId: WelcomeStepId; done: boolean }) => data)
  .handler(async ({ data }) => {
    const { setWelcomeStep } = await import("./welcome.server");
    await setWelcomeStep(data.slug, data.stepId, data.done);
    return { ok: true as const };
  });

export const finishWelcomeFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { finishWelcome } = await import("./welcome.server");
    await finishWelcome(data.slug);
    return { ok: true as const };
  });

export const getFirst48 = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadFirst48 } = await import("./welcome.server");
    return loadFirst48(data.slug);
  });

export const saveFirst48Fn = createServerFn({ method: "POST" })
  .inputValidator(validateFirst48Input)
  .handler(async ({ data }: { data: First48Input }) => {
    const { saveFirst48 } = await import("./welcome.server");
    await saveFirst48(data);
    return { ok: true as const };
  });
