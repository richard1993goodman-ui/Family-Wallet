// The emails that carry a household's wallet link and access code. Pure functions, so they are easy to test.

export type WalletDetails = { familyName: string; url: string; code: string };

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * @param kind "welcome" right after paying, "recover" when someone asks for their details again.
 */
export function buildWalletEmail(kind: "welcome" | "recover", wallets: WalletDetails[]) {
  const many = wallets.length > 1;
  const subject =
    kind === "welcome"
      ? "Your Family Wallet is ready"
      : many
        ? "Your Family Wallet links and access codes"
        : "Your Family Wallet link and access code";
  const intro =
    kind === "welcome"
      ? "Thank you for subscribing. Your private wallet is ready. Keep this email: it has everything you need to open it on any phone or computer."
      : "You asked us to send your wallet details again. Here they are.";
  const outro =
    "To add your nanny, au pair or other staff, open the wallet and go to Household staff. Each person gets their own sign-in code. You can manage or cancel your subscription from the footer of your wallet.";

  const text = [
    intro,
    "",
    ...wallets.flatMap((w) => [w.familyName, `Wallet link: ${w.url}`, `Access code: ${w.code}`, ""]),
    outro,
    "",
    "The Family Wallet",
  ].join("\n");

  const blocks = wallets
    .map(
      (w) => `<div style="margin:0 0 20px;padding:18px 20px;border:1px solid #ece3d6;border-radius:12px;background:#ffffff">
<p style="margin:0 0 10px;font-weight:600">${escapeHtml(w.familyName)}</p>
<p style="margin:0 0 4px;font-size:13px;color:#6b5f55">Wallet link</p>
<p style="margin:0 0 12px"><a href="${escapeHtml(w.url)}" style="color:#2f5d4a">${escapeHtml(w.url)}</a></p>
<p style="margin:0 0 4px;font-size:13px;color:#6b5f55">Access code</p>
<p style="margin:0;font-family:ui-monospace,Menlo,monospace;font-size:22px;letter-spacing:0.2em">${escapeHtml(w.code)}</p>
</div>`,
    )
    .join("\n");

  const html = `<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:#fbf7f0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#2a2420;line-height:1.6">
<div style="max-width:32rem;margin:0 auto">
<p style="font-size:22px;margin:0 0 20px;font-family:Georgia,serif">The Family Wallet</p>
<p style="margin:0 0 20px">${escapeHtml(intro)}</p>
${blocks}
<p style="margin:0 0 20px;font-size:14px">${escapeHtml(outro)}</p>
<p style="margin:0;font-size:13px;color:#6b5f55">If you did not expect this email you can ignore it.</p>
</div></body></html>`;

  return { subject, html, text };
}
