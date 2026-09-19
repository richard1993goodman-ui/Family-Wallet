import { createServerFn } from "@tanstack/react-start";

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

export const saveAgreementFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; data: AgreementData; publish: boolean }) => data)
  .handler(async ({ data }) => {
    const { saveAgreementFromWallet } = await import("./agreement.server");
    return saveAgreementFromWallet(data.slug, data.data, data.publish);
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
