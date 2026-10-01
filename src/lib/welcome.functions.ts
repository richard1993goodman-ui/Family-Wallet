import { createServerFn } from "@tanstack/react-start";

import type { WelcomeStepId } from "./welcome.types";

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
