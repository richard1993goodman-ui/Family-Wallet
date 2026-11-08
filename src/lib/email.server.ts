// Sends email through Resend. Server-only.
// Needs RESEND_API_KEY, plus a sender address on a domain verified in Resend (EMAIL_FROM).
// Without a key this does nothing, so payments and wallet creation never depend on email.

const DEFAULT_FROM = "The Family Wallet <wallet@familywallet.io>";

export type EmailMessage = { to: string; subject: string; html: string; text: string };

export const emailConfigured = () => Boolean(process.env["RESEND_API_KEY"]);

/** Returns true when Resend accepted the message. Never throws. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) {
    console.warn("Email not sent: RESEND_API_KEY is not set");
    return false;
  }
  try {
    const replyTo = process.env["EMAIL_REPLY_TO"];
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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
