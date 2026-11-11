// Sends email through the linked Resend connector. Server-only.
// Needs RESEND_API_KEY, plus a sender address on a domain verified in Resend (EMAIL_FROM).
// Without a key this does nothing, so payments and wallet creation never depend on email.

const DEFAULT_FROM = "The Family Wallet <wallet@familywallet.io>";

import { CONTACT_EMAIL } from "./site";

export type EmailMessage = { to: string; subject: string; html: string; text: string };

export const emailConfigured = () => Boolean(process.env["RESEND_API_KEY"] && process.env["LOVABLE_API_KEY"]);

/** Returns true when Resend accepted the message. Never throws. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  const projectKey = process.env["LOVABLE_API_KEY"];
  if (!key || !projectKey) {
    console.warn("Email not sent: Resend connection is not configured");
    return false;
  }
  try {
    const replyTo = process.env["EMAIL_REPLY_TO"] || CONTACT_EMAIL;
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${projectKey}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env["EMAIL_FROM"] || DEFAULT_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.error("Resend rejected the email", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email failed", error);
    return false;
  }
}
