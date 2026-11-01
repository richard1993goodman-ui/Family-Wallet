import { createServerFn } from "@tanstack/react-start";

export const getTraining = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadTraining } = await import("./training.server");
    return loadTraining(data.slug);
  });

export const submitTrainingFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; learnerName: string; answers: Record<string, number> }) => data)
  .handler(async ({ data }) => {
    const { submitTraining } = await import("./training.server");
    return submitTraining(data.slug, data.learnerName, data.answers);
  });

export const getCertificate = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { loadCertificate } = await import("./training.server");
    return loadCertificate(data.slug, data.id);
  });
