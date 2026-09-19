import { createServerFn } from "@tanstack/react-start";

import type { AgreementData } from "./agreement.model";

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

export const generateAgreementDraftFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; data: AgreementData; notes: string }) => data)
  .handler(async ({ data }) => {
    const { generateAgreementDraft } = await import("./agreement.ai.server");
    return generateAgreementDraft(data.slug, data.data, data.notes);
  });

export const getNannyInvite = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; regenerate?: boolean }) => data)
  .handler(async ({ data }) => {
    const { ensureNannyInvite } = await import("./wallet.server");
    return ensureNannyInvite(data.slug, data.regenerate === true);
  });

export const nannySignIn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; code: string }) => data)
  .handler(async ({ data }) => {
    const { attemptNannyUnlock } = await import("./wallet.server");
    return attemptNannyUnlock(data.slug, data.code);
  });

export const nannyWalletName = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { walletExists, isNannyUnlocked } = await import("./wallet.server");
    return { familyName: await walletExists(data.slug), unlocked: await isNannyUnlocked(data.slug) };
  });
