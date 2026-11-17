import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// The Enterprise enquiry form on the pricing page (17 Nov 2026). It emails the support inbox and stores nothing.
// Spam: a hidden field real people never fill, a minimum time on the form, and length limits on every field.
// shortcut: no per-address rate limit (it would need a table); add one if the inbox starts getting junk.

const Enquiry = z.object({
  agency: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  households: z.string().trim().min(1).max(40),
  message: z.string().trim().max(1000).optional(),
  /** Hidden from people; a bot that fills every field gives itself away. */
  website: z.string().max(0).optional(),
  /** Milliseconds between the form appearing and being sent. */
  elapsed: z.number().int().nonnegative(),
});
export type EnquiryInput = z.infer<typeof Enquiry>;

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

export const sendEnterpriseEnquiry = createServerFn({ method: "POST" })
  .inputValidator((data: EnquiryInput) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; reason?: "invalid" | "unavailable" }> => {
    const parsed = Enquiry.safeParse(data);
    if (!parsed.success) return { ok: false, reason: "invalid" };
    const e = parsed.data;
    // Looks like a bot: say it worked and send nothing, so it learns nothing.
    if (e.website || e.elapsed < 3000) return { ok: true };

    const { emailConfigured, sendEmail } = await import("./email.server");
    const { CONTACT_EMAIL } = await import("./site");
    if (!emailConfigured()) return { ok: false, reason: "unavailable" };
    const rows: [string, string][] = [
      ["Agency", e.agency],
      ["Contact", e.name],
      ["Work email", e.email],
      ["Households", e.households],
      ["Message", e.message || "(none)"],
    ];
    const sent = await sendEmail({
      to: CONTACT_EMAIL,
      subject: `Enterprise enquiry: ${e.agency}`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      html: `<table>${rows.map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${escapeHtml(v)}</td></tr>`).join("")}</table>`,
    });
    return sent ? { ok: true } : { ok: false, reason: "unavailable" };
  });
