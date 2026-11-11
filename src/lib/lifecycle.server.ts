// The daily lifecycle job: emails locked households their reminders and, only when LIFECYCLE_PURGE=on, deletes the ones
// whose 30 days are over. With the switch off (the default) it reports what it would delete and removes nothing.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "./email.server";
import { buildLifecycleEmail, daysLeft, planLifecycle, type LockedHousehold } from "./lifecycle";
import { filePrefixes } from "./export";

const SITE = "https://familywallet.io";

type Row = {
  id: string; slug: string; family_name: string; contact_email: string | null; status: string;
  locked_at: string | null; delete_after: string | null; deletion_hold: boolean; deletion_notices: number[] | null; deletion_confirmed: boolean;
};

async function lockedHouseholds(): Promise<LockedHousehold[]> {
  const columns = "id, slug, family_name, contact_email, status, locked_at, delete_after, deletion_hold, deletion_notices, deletion_confirmed";
  const { data, error } = await supabaseAdmin.from("families").select(columns as "id").in("status", ["suspended", "cancelled"]);
  if (error) throw new Error(`Could not read locked wallets: ${error.message}`);
  return (data as unknown as Row[]).map((r) => ({
    id: r.id, slug: r.slug, familyName: r.family_name, email: r.contact_email, status: r.status,
    lockedAt: r.locked_at ? new Date(r.locked_at) : null, deleteAfter: r.delete_after ? new Date(r.delete_after) : null,
    hold: r.deletion_hold, notices: Array.isArray(r.deletion_notices) ? r.deletion_notices : [], ownerConfirmed: r.deletion_confirmed,
  }));
}

/** Every file under a household's folders in the private bucket, going down into sub-folders. */
async function listFiles(prefix: string, depth = 0): Promise<string[]> {
  const bucket = supabaseAdmin.storage.from("family-docs");
  const found: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data } = await bucket.list(prefix.replace(/\/$/, ""), { limit: 100, offset });
    if (!data?.length) break;
    for (const item of data) {
      if (item.id) found.push(`${prefix}${item.name}`);
      else if (depth < 4) found.push(...(await listFiles(`${prefix}${item.name}/`, depth + 1)));
    }
    if (data.length < 100) break;
  }
  return found;
}

async function purge(h: LockedHousehold) {
  const paths = (await Promise.all(filePrefixes(h.id).map((p) => listFiles(p)))).flat();
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabaseAdmin.storage.from("family-docs").remove(paths.slice(i, i + 100));
    if (error) throw new Error(`Files not removed, household kept: ${error.message}`);
  }
  const { error } = await supabaseAdmin.rpc("purge_family" as never, { _family: h.id, _reason: "30-day window ended" } as never);
  if (error) throw new Error(`Purge failed: ${(error as { message: string }).message}`);
}

export async function runLifecycle(now = new Date()) {
  const purgeOn = process.env["LIFECYCLE_PURGE"] === "on";
  const households = await lockedHouseholds();
  const byId = new Map(households.map((h) => [h.id, h]));
  const report = { checked: households.length, reminded: 0, failed: 0, purged: 0, wouldPurge: 0, skipped: {} as Record<string, number> };

  for (const step of planLifecycle(now, households)) {
    const h = byId.get(step.id)!;
    try {
      if (step.action === "skip") report.skipped[step.reason] = (report.skipped[step.reason] ?? 0) + 1;
      else if (step.action === "remind") {
        const mail = buildLifecycleEmail({
          day: step.day, familyName: h.familyName, deleteOn: h.deleteAfter!, daysLeft: daysLeft(now, h.deleteAfter!), exportUrl: `${SITE}/export/${h.slug}`,
        });
        if (await sendEmail({ to: h.email!, ...mail })) {
          await supabaseAdmin.from("families").update({ deletion_notices: [...h.notices, step.day] } as never).eq("id", h.id);
          report.reminded++;
        } else report.failed++;
      } else if (purgeOn) {
        await purge(h);
        report.purged++;
      } else report.wouldPurge++;
    } catch (error) {
      console.error("Lifecycle step failed", h.id, error);
      report.failed++;
    }
  }
  return { purgeOn, ...report };
}
