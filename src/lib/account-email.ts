// The email that lets someone turn their code login into their own account. Pure, so it is easy to test.
export type ClaimEmailDetails = { name: string; familyName: string; url: string; minutes: number };

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function buildClaimEmail(d: ClaimEmailDetails) {
  const subject = "Create your Family Wallet login";
  const text = [
    `Hello ${d.name},`,
    "",
    `Use this link to create your own Family Wallet login for ${d.familyName}. It works once and expires in ${d.minutes} minutes:`,
    d.url,
    "",
    "If you didn't ask for this, ignore this email. Nothing changes until the link is opened.",
  ].join("\n");
  const html = `<p>Hello ${esc(d.name)},</p><p>Use this link to create your own Family Wallet login for ${esc(d.familyName)}. It works once and expires in ${d.minutes} minutes.</p><p><a href="${esc(d.url)}" style="display:inline-block;background:#1a382b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Create my login</a></p><p style="color:#57534e;font-size:14px">If you didn't ask for this, ignore this email. Nothing changes until the link is opened.</p>`;
  return { subject, html, text };
}
