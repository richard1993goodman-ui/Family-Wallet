// The emails that carry a household's wallet link and access code. Pure functions, so they are easy to test.

export type WalletDetails = { familyName: string; url: string; code: string };

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A page inside one wallet, given the wallet's own link (".../w/<slug>"). */
const pageUrl = (walletUrl: string, page: string) => walletUrl.replace(/\/w\/([^/?#]+)$/, `/${page}/$1`);

/** The first things a new family should do, in order. Shared by the text and html versions. */
export function nextSteps(walletUrl: string) {
  return [
    {
      title: "Add your nanny",
      body: "Open Household staff and add the person who looks after your children. They get their own sign-in code, so you can share the week, messages and updates with them.",
      url: pageUrl(walletUrl, "nannies"),
    },
    {
      title: "Decide about the agreement",
      body: "Build and sign a nanny agreement in the wallet, or skip it if you already have one. If you skip it, add your nanny's working hours so the weekly schedule fits your family.",
      url: pageUrl(walletUrl, "hours"),
    },
    {
      title: "Add your children and emergency details",
      body: "Add each child, any allergies or medication, and your emergency contacts, so your nanny has what they need to hand.",
      url: pageUrl(walletUrl, "family"),
    },
    {
      title: "Turn on phone alerts",
      body: "Get a quiet alert when your nanny sends a message, photo or daily update. On iPhone, add the wallet to your Home Screen first (Share, then Add to Home Screen).",
      url: pageUrl(walletUrl, "notifications"),
    },
  ];
}

/**
 * @param kind "welcome" right after paying, "recover" when someone asks for their details again.
 * @param options.supportEmail An address people can reply to for help; without one, the wallet's Support page is offered.
 */
export function buildWalletEmail(
  kind: "welcome" | "recover",
  wallets: WalletDetails[],
  options: { supportEmail?: string | undefined } = {},
) {
  if (kind === "welcome" && wallets.length === 1) return buildWelcomeEmail(wallets[0]!, options.supportEmail);
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

function buildWelcomeEmail(wallet: WalletDetails, supportEmail?: string) {
  const subject = "Welcome to The Family Wallet: your link and access code";
  const steps = nextSteps(wallet.url);
  const supportUrl = pageUrl(wallet.url, "support");
  const help = supportEmail
    ? `Stuck, or not sure where to start? Reply to this email or write to ${supportEmail}, and we'll help.`
    : `Stuck, or not sure where to start? Message us from the Support page in your wallet: ${supportUrl}`;
  const welcome = `Welcome, and thank you for subscribing. Your private wallet for ${wallet.familyName} is ready, and you're already signed in on the device you paid from.`;
  const keep =
    "Please save this email, or copy these two details into your Notes app or a password manager. There is no separate password: your access code is your password. You'll need both to open your wallet on another phone or computer, and they can't be shown again if lost (we can resend them from the sign-in page).";

  const text = [
    "Welcome to The Family Wallet",
    "",
    welcome,
    "",
    `Wallet link: ${wallet.url}`,
    `Access code: ${wallet.code}`,
    "",
    keep,
    "",
    "YOUR FIRST STEPS",
    ...steps.flatMap((step, i) => [`${i + 1}. ${step.title}`, `   ${step.body}`, `   ${step.url}`, ""]),
    help,
    "",
    "You can manage or cancel your subscription from the footer of your wallet.",
    "",
    "The Family Wallet",
  ].join("\n");

  const stepHtml = steps
    .map(
      (step, i) => `<tr><td style="vertical-align:top;padding:0 14px 16px 0"><span style="display:inline-block;width:26px;height:26px;border-radius:13px;background:#2f5d4a;color:#ffffff;text-align:center;line-height:26px;font-size:14px;font-weight:600">${i + 1}</span></td>
<td style="padding:0 0 16px"><p style="margin:0;font-weight:600">${escapeHtml(step.title)}</p>
<p style="margin:2px 0 6px;font-size:14px;color:#4a3f37">${escapeHtml(step.body)}</p>
<a href="${escapeHtml(step.url)}" style="font-size:14px;color:#2f5d4a">Open this page</a></td></tr>`,
    )
    .join("\n");

  const helpHtml = supportEmail
    ? `Stuck, or not sure where to start? Reply to this email or write to <a href="mailto:${escapeHtml(supportEmail)}" style="color:#2f5d4a">${escapeHtml(supportEmail)}</a>, and we'll help.`
    : `Stuck, or not sure where to start? <a href="${escapeHtml(supportUrl)}" style="color:#2f5d4a">Message us from the Support page in your wallet</a>.`;

  const html = `<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:#fbf7f0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#2a2420;line-height:1.6">
<div style="max-width:32rem;margin:0 auto">
<p style="font-size:22px;margin:0 0 20px;font-family:Georgia,serif">The Family Wallet</p>
<p style="font-size:20px;margin:0 0 12px;font-family:Georgia,serif">Welcome, ${escapeHtml(wallet.familyName)}</p>
<p style="margin:0 0 20px">${escapeHtml(welcome)}</p>
<div style="margin:0 0 12px;padding:18px 20px;border:2px solid #2f5d4a;border-radius:12px;background:#ffffff">
<p style="margin:0 0 4px;font-size:13px;color:#6b5f55">Wallet link</p>
<p style="margin:0 0 12px"><a href="${escapeHtml(wallet.url)}" style="color:#2f5d4a">${escapeHtml(wallet.url)}</a></p>
<p style="margin:0 0 4px;font-size:13px;color:#6b5f55">Access code</p>
<p style="margin:0;font-family:ui-monospace,Menlo,monospace;font-size:22px;letter-spacing:0.2em">${escapeHtml(wallet.code)}</p>
</div>
<p style="margin:0 0 28px;font-size:14px;color:#4a3f37"><strong>Save this email.</strong> ${escapeHtml(keep)}</p>
<p style="font-size:18px;margin:0 0 14px;font-family:Georgia,serif">Your first steps</p>
<table role="presentation" style="border-collapse:collapse;margin:0 0 12px">
${stepHtml}
</table>
<p style="margin:8px 0 20px;font-size:14px">${helpHtml}</p>
<p style="margin:0 0 8px;font-size:13px;color:#6b5f55">You can manage or cancel your subscription from the footer of your wallet.</p>
<p style="margin:0;font-size:13px;color:#6b5f55">If you did not expect this email you can ignore it.</p>
</div></body></html>`;

  return { subject, html, text };
}
