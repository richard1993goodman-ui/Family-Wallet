import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bearerMatches } from "./job-auth";
import { entitlementOpen, parseIapEvent, stateFor, walletStatusFor, willRenewFor } from "./iap";

// shortcut: the generated database types do not list the entitlement tables until the migration is applied and
// the types are regenerated; remove this untyped alias then and use supabaseAdmin directly.
const untyped = supabaseAdmin as unknown as SupabaseClient;

/** RevenueCat sends this secret in the Authorization header; set the same value in its dashboard. */
export const verifyRevenueCatAuth = (header: string | null) =>
  bearerMatches(header, process.env["REVENUECAT_WEBHOOK_SECRET"]);

/** A retried or out-of-order delivery must not move the state backwards: ignore an event that ends before what we hold. */
export const isStale = (heldEnd: string | null, eventEnd: string | null) =>
  !!heldEnd && !!eventEnd && new Date(eventEnd).getTime() < new Date(heldEnd).getTime();

/**
 * Applies one RevenueCat event: records the entitlement and the event, then opens or closes the wallet it pays for.
 * Safe to call twice with the same event.
 */
export async function applyIapEvent(body: unknown) {
  const event = parseIapEvent(body);
  if (!event) return { ignored: "not a usable event" as const };
  const state = stateFor(event);
  if (!state || !event.externalRef) return { ignored: "not tracked" as const };

  const { data: person } = await supabaseAdmin
    .from("people")
    .select("id")
    .eq("id", event.personId)
    .maybeSingle();
  if (!person) return { ignored: "unknown person" as const };

  const { data: held } = await untyped
    .from("entitlements")
    .select("id, family_id, current_period_end")
    .eq("source", "apple_iap")
    .eq("external_ref", event.externalRef)
    .maybeSingle();

  let entitlementId = held?.id ?? null;
  let familyId = held?.family_id ?? null;
  const stale = isStale(held?.current_period_end ?? null, event.periodEnd);

  if (!held) {
    // The wallet this pays for, if the person already has one.
    const { data: owner } = await supabaseAdmin
      .from("household_members")
      .select("family_id")
      .eq("person_id", person.id)
      .eq("role", "owner")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    familyId = owner?.family_id ?? null;
    const { data: created, error } = await untyped
      .from("entitlements")
      .insert({
        person_id: person.id,
        family_id: familyId,
        source: "apple_iap",
        state,
        product: event.product,
        external_ref: event.externalRef,
        environment: event.environment,
        current_period_end: event.periodEnd,
        will_renew: willRenewFor(event.type),
      })
      .select("id")
      .single();
    if (error || !created) throw new Error("Could not record the entitlement");
    entitlementId = created.id;
  } else if (!stale) {
    await untyped
      .from("entitlements")
      .update({
        state,
        product: event.product,
        environment: event.environment,
        current_period_end: event.periodEnd,
        will_renew: willRenewFor(event.type),
        updated_at: new Date().toISOString(),
      })
      .eq("id", held.id);
  }

  const { error: eventError } = await untyped.from("entitlement_events").insert({
    entitlement_id: entitlementId!,
    event_type: event.type,
    provider_event_id: event.eventId,
    detail: {
      product: event.product,
      state,
      periodEnd: event.periodEnd,
      environment: event.environment,
      stale,
    },
  });
  // 23505 = this exact delivery was already recorded: nothing more to do.
  if (eventError?.code === "23505") return { duplicate: true as const };
  if (eventError) throw new Error("Could not record the event");

  if (familyId && !stale) {
    // Agency-sponsored wallets are funded by the agency, never closed by a personal subscription lapsing.
    const { data: family } = await supabaseAdmin
      .from("families")
      .select("partner_agency_id")
      .eq("id", familyId)
      .maybeSingle();
    if (family && !family.partner_agency_id) {
      await supabaseAdmin
        .from("families")
        .update({
          status: walletStatusFor(entitlementOpen(state, event.periodEnd)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", familyId);
    }
  }

  const { audit } = await import("./audit.server");
  await audit({
    actorKind: "webhook",
    action: `iap_${event.type.toLowerCase()}`,
    familyId,
    meta: { state, environment: event.environment, stale },
  });
  return { applied: true as const, state };
}
