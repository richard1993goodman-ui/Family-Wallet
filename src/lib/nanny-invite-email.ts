// The email a nanny gets when their family activates the wallet their agency set up. Pure, so it is easy to test.
export type NannyInviteDetails = { nannyName: string; familyName: string; agencyName?: string | undefined; url: string; code: string; supportEmail?: string | undefined };

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Who is inviting: an agency on the family's behalf, or the family themselves. */
const intro = (d: NannyInviteDetails) =>
  d.agencyName
    ? `${d.agencyName} has set up a Family Wallet for you to use with the ${d.familyName}.`
    : `${d.familyName} has set up a Family Wallet for you.`;

export function buildNannyInviteEmail(d: NannyInviteDetails) {
  const subject = `Your Family Wallet sign-in for ${d.familyName}`;
  const text = [
    `Hello ${d.nannyName},`,
    "",
    `${intro(d)} It keeps the weekly rota, messages, daily log, timesheets and your agreement in one place.`,
    "",
    `Your private link: ${d.url}`,
    `Your access code: ${d.code}`,
    "",
    "This code is yours alone. Don't share it. Soon you'll also be able to open the wallet in the Family Wallet app for iPhone and Android.",
    d.supportEmail ? `\nQuestions? ${d.supportEmail}` : "",
  ].join("\n");
  const html = `<p>Hello ${esc(d.nannyName)},</p><p>${esc(intro(d))} It keeps the weekly rota, messages, daily log, timesheets and your agreement in one place.</p><p><a href="${esc(d.url)}" style="display:inline-block;background:#1a382b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Open my wallet</a></p><p>Your access code: <strong style="font-size:20px;letter-spacing:3px">${esc(d.code)}</strong></p><p style="color:#57534e;font-size:14px">This code is yours alone, so don't share it. Soon you'll also be able to open the wallet in the Family Wallet app for iPhone and Android.</p>`;
  return { subject, html, text };
}
