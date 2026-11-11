import { createServerFn } from "@tanstack/react-start";

import type { AgreementData } from "./agreement.model";

export const getAgreement = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; nannyId?: string | null }) => data)
  .handler(async ({ data }) => {
    const { loadAgreement } = await import("./agreement.server");
    return loadAgreement(data.slug, data.nannyId ?? null);
  });

export const getSignatures = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadSignatures } = await import("./agreement.server");
    return loadSignatures(data.slug);
  });

export const saveAgreementFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { slug: string; data: AgreementData; publish: boolean; nannyId?: string | null }) =>
      data,
  )
  .handler(async ({ data }) => {
    const { saveAgreementFromWallet } = await import("./agreement.server");
    return saveAgreementFromWallet(data.slug, data.data, data.publish, data.nannyId ?? null);
  });

export const signDocumentFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      slug: string;
      docKind: "agreement" | "terms";
      signerRole: "parent" | "nanny";
      signerName: string;
      nannyId?: string | null;
      verification?: { email: string; code: string } | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { signDocument } = await import("./agreement.server");
    return signDocument(
      data.slug,
      data.docKind,
      data.signerRole,
      data.signerName,
      data.nannyId ?? null,
      data.verification ? { email: String(data.verification.email ?? ""), code: String(data.verification.code ?? "") } : null,
    );
  });

export const requestSigningCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; signerRole: "parent" | "nanny"; email: string; nannyId?: string | null }) => data)
  .handler(async ({ data }) => {
    const { requestSigningCode } = await import("./agreement.server");
    return requestSigningCode(data.slug, data.signerRole === "nanny" ? "nanny" : "parent", String(data.email ?? ""), data.nannyId ?? null);
  });

export const generateAgreementDraftFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; data: AgreementData; notes: string }) => data)
  .handler(async ({ data }) => {
    const { generateAgreementDraft } = await import("./agreement.ai.server");
    return generateAgreementDraft(data.slug, data.data, data.notes);
  });

export const generateStatementFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; data: AgreementData; notes: string }) => data)
  .handler(async ({ data }) => {
    const { generateWrittenStatement } = await import("./agreement.ai.server");
    return generateWrittenStatement(data.slug, data.data, data.notes);
  });

export const getNannyInvite = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; nannyId: string; regenerate?: boolean }) => data)
  .handler(async ({ data }) => {
    const { ensureNannyInvite } = await import("./wallet.server");
    return ensureNannyInvite(data.slug, data.nannyId, data.regenerate === true);
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
