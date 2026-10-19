import { createServerFn } from "@tanstack/react-start";

export const getWalletSummary = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadWallet, walletExists } = await import("./wallet.server");
    const wallet = await loadWallet(data.slug);
    if (wallet) return { unlocked: true as const, wallet };
    const familyName = await walletExists(data.slug);
    return { unlocked: false as const, exists: !!familyName, familyName };
  });

/** Opens the shared demo vault (slug "demo") without a code, for prospective families. */
export const openDemoWallet = createServerFn({ method: "POST" }).handler(async () => {
  const { openDemo } = await import("./wallet.server");
  return openDemo();
});

export const unlockWallet = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; code: string }) => data)
  .handler(async ({ data }) => {
    const { attemptUnlock } = await import("./wallet.server");
    return attemptUnlock(data.slug, data.code);
  });

export const lockWalletFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { lockWallet } = await import("./wallet.server");
    await lockWallet(data.slug);
    return { ok: true as const };
  });

export const getDocumentUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; docType: string }) => data)
  .handler(async ({ data }) => {
    const { documentUrl } = await import("./wallet.server");
    return { url: await documentUrl(data.slug, data.docType) };
  });
