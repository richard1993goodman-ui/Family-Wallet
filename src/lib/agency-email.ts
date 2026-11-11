// The email a new agency partner gets the moment their subscription is paid for.
// Pure functions, so the wording is easy to test.

import { CONTACT_EMAIL } from "./site";

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type AgencyEmailInput = {
  agencyName: string;
  plan: string;
  allowance: number;
  contactEmail: string;
};

export function buildAgencyWelcomeEmail({
  agencyName,
  plan,
  allowance,
  contactEmail,
}: AgencyEmailInput) {
  const subject = "Your Family Wallet agency account is set up";
  const text = `Hi ${agencyName},

Your ${plan} subscription is paid and your agency account is created with room for ${allowance} household seats.

What happens next:
1. We email you a setup link for your agency login. It goes to ${contactEmail}.
2. You sign in and see your numbered household seats.
3. You invite your families by email. Each one creates its own private wallet, which you never see.

If anything above is not what you expected, just reply to this email.

Family Wallet
${CONTACT_EMAIL}`;

  const html = `<div style="font-family:system-ui,sans-serif;max-width:34rem;line-height:1.6;color:#2a2420">
<p>Hi ${escapeHtml(agencyName)},</p>
<p>Your <strong>${escapeHtml(plan)}</strong> subscription is paid and your agency account is created with room for <strong>${allowance} household seats</strong>.</p>
<p><strong>What happens next</strong></p>
<ol>
  <li>We email you a setup link for your agency login. It goes to ${escapeHtml(contactEmail)}.</li>
  <li>You sign in and see your numbered household seats.</li>
  <li>You invite your families by email. Each one creates its own private wallet, which you never see.</li>
</ol>
<p>If anything above is not what you expected, just reply to this email.</p>
<p style="color:#6b5f55">Family Wallet<br>${escapeHtml(CONTACT_EMAIL)}</p>
</div>`;

  return { subject, text, html };
}

/** The note to the account owner so a new agency is never waiting on an unseen inbox. */
export function buildAgencyOwnerEmail({ agencyName, plan, allowance, contactEmail }: AgencyEmailInput) {
  const subject = `New agency subscription: ${agencyName} (${plan})`;
  const text = `${agencyName} subscribed to the ${plan} plan (${allowance} household seats).
Contact: ${contactEmail}
Create their staff login and send the setup link from Agency settings.`;
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#2a2420">
<p><strong>${escapeHtml(agencyName)}</strong> subscribed to the <strong>${escapeHtml(plan)}</strong> plan (${allowance} household seats).</p>
<p>Contact: ${escapeHtml(contactEmail)}</p>
<p>Create their staff login and send the setup link from Agency settings.</p>
</div>`;
  return { subject, text, html };
}
