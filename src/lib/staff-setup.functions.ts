import { createServerFn } from "@tanstack/react-start";

// Public: sends an account invite only to emails the owner has added as partner staff.
// Always returns the same answer so it can't be used to check which emails are invited.
export const requestStaffSetup = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; origin: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email");
    // Always send email links to the public site; preview/editor domains are private and show a proxy error.
    const origin = "https://familywallet.io";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: staff } = await supabaseAdmin
      .from("partner_agency_staff")
      .select("id, user_id, agency_id")
      .eq("email", email)
      .maybeSingle();
    if (staff) {
      const { data: agency } = await supabaseAdmin.from("partner_agencies").select("status").eq("id", staff.agency_id).maybeSingle();
      if (agency?.status === "active") {
        const redirect = origin ? { redirectTo: `${origin}/auth?setup=1` } : {};
        if (!staff.user_id) {
          const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, redirect);
          if (error && !/already/i.test(error.message)) console.error("staff invite failed", error.message);
        } else {
          // Already joined: send a password reset link to the confirmed staff email only.
          const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, redirect);
          if (error) console.error("staff reset failed", error.message);
        }
      }
    }
    return { ok: true as const };
  });
