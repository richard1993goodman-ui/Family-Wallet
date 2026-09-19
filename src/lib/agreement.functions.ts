import { createServerFn } from "@tanstack/react-start";

import type { AgreementFields } from "./agreement.types";

export const getAgreement = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadAgreement } = await import("./agreement.server");
    return loadAgreement(data.slug);
  });

export const getSignatures = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadSignatures } = await import("./agreement.server");
    return loadSignatures(data.slug);
  });

export const signDocumentFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      slug: string;
      docKind: "agreement" | "terms";
      signerRole: "parent" | "nanny";
      signerName: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { signDocument } = await import("./agreement.server");
    return signDocument(data.slug, data.docKind, data.signerRole, data.signerName);
  });

export type { AgreementFields };
