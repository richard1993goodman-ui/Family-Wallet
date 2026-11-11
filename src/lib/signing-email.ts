// Emails around signing an agreement. Pure, so they are easy to test.
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The one-time code that proves the signer controls this email address. Carries no link and no wallet credential. */
export function buildSigningCodeEmail(d: { code: string; familyName: string; minutes: number }) {
  const subject = `Your signing code: ${d.code}`;
  const text = [
    `Your code to sign the agreement for ${d.familyName} is:`,
    "",
    d.code,
    "",
    `It works once and expires in ${d.minutes} minutes. If you didn't ask to sign, ignore this email and don't share the code.`,
  ].join("\n");
  const html = `<p>Your code to sign the agreement for ${esc(d.familyName)} is:</p><p style="font-size:26px;letter-spacing:6px"><strong>${esc(d.code)}</strong></p><p style="color:#57534e;font-size:14px">It works once and expires in ${d.minutes} minutes. If you didn't ask to sign, ignore this email and don't share the code.</p>`;
  return { subject, html, text };
}

/** Tells a signer a signed record copy now exists. Deliberately generic: it names no wording and carries no link. */
export function buildSignedCopyEmail(d: { name: string; familyName: string; version: number }) {
  const subject = "Your signed agreement is saved";
  const text = `Hello ${d.name},\n\nThe agreement for ${d.familyName} (version ${d.version}) has now been signed by both of you. A record copy is saved in the Documents section of your Family Wallet.\n\nIf you didn't sign this, tell the household straight away.`;
  const html = `<p>Hello ${esc(d.name)},</p><p>The agreement for ${esc(d.familyName)} (version ${d.version}) has now been signed by both of you. A record copy is saved in the Documents section of your Family Wallet.</p><p style="color:#57534e;font-size:14px">If you didn't sign this, tell the household straight away.</p>`;
  return { subject, html, text };
}
