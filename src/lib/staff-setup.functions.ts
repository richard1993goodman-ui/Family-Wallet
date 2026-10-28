import { createServerFn } from "@tanstack/react-start";

// Public: sends an account invite only to emails the owner has added as partner staff.
// Always returns the same answer so it can't be used to check which emails are invited.
export const requestStaffSetup = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; origin: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email");
    const origin = /^https?:\/\/[^/]+$/.test(data.origin) ? data.origin : "";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: staff } = await supabaseAdmin
      .from("partner_agency_staff")
      .select("id, user_id, agency_id")
      .eq("email", email)
      .maybeSingle();
    if (staff && !staff.user_id) {
      const { data: agency } = await supabaseAdmin.from("partner_agencies").select("status").eq("id", staff.agency_id).maybeSingle();
      if (agency?.status === "active") {
        const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: origin ? `${origin}/auth?setup=1` : undefined,
        });
        if (error && !/already/i.test(error.message)) console.error("staff invite failed", error.message);
      }
    }
    return { ok: true as const };
  });
