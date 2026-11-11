import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireOwner } from "./staff.scope";

type Row = {
  id: string; family_name: string; contact_email: string | null; status: string; delete_after: string | null;
  deletion_hold: boolean; deletion_notices: number[] | null; deletion_confirmed: boolean;
};

/** Locked wallets, soonest deletion first. Owner only. */
export const listLockedFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("families")
      .select("id, family_name, contact_email, status, delete_after, deletion_hold, deletion_notices, deletion_confirmed" as "id")
      .in("status", ["suspended", "cancelled"]);
    if (error) throw new Error(error.message);
    const { daysLeft } = await import("./lifecycle");
    const now = new Date();
    return (data as unknown as Row[])
      .map((r) => ({
        id: r.id,
        familyName: r.family_name,
        hasEmail: Boolean(r.contact_email),
        status: r.status,
        deleteAfter: r.delete_after,
        daysLeft: r.delete_after ? daysLeft(now, new Date(r.delete_after)) : null,
        hold: r.deletion_hold,
        confirmed: r.deletion_confirmed,
        noticesSent: Array.isArray(r.deletion_notices) ? r.deletion_notices : [],
      }))
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
  });

/** Stops (or allows) deletion of one locked wallet, and records the owner's go-ahead for one that cannot be emailed. */
export const setDeletionFlagFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; flag: "hold" | "confirmed"; value: boolean }) => ({
    id: String(data.id), flag: data.flag === "hold" ? ("hold" as const) : ("confirmed" as const), value: Boolean(data.value),
  }))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const column = data.flag === "hold" ? "deletion_hold" : "deletion_confirmed";
    const { error } = await supabaseAdmin.from("families").update({ [column]: data.value } as never).eq("id", data.id).in("status", ["suspended", "cancelled"]);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
