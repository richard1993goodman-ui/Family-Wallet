import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AGENCY_PLANS, isAgencyPlan } from "./agency-plans";
import { graceDays, transitionEnd } from "./entitlement";
import { buildSeats, hashInviteToken, INVITE_DAYS, isValidEmail, newInviteToken, normaliseEmail, seatCount, type InviteRow } from "./seat-invites";

const OPEN = ["pending", "accepted"];

async function agencyInfo(agencyId: string) {
  const { data } = await supabaseAdmin
    .from("partner_agencies")
    .select("name, brand_name, plan, household_allowance")
    .eq("id", agencyId)
    .maybeSingle();
  if (!data) throw new Error("Agency not found");
  const plan = isAgencyPlan(data.plan) ? data.plan : "partner";
  return { ...data, allowance: data.household_allowance ?? AGENCY_PLANS[plan].allowance, planName: AGENCY_PLANS[plan].name };
}

/** Frees the seats held by invites that ran out, so a new invite can reuse them. */
async function expireOld(agencyId: string) {
  await supabaseAdmin
    .from("agency_invites")
    .update({ status: "revoked", token_hash: null })
    .eq("agency_id", agencyId)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());
}

async function openInvites(agencyId: string) {
  const query = (columns: string) =>
    supabaseAdmin.from("agency_invites").select(columns).eq("agency_id", agencyId).in("status", OPEN).order("slot", { ascending: true });
  const full = await query("id, slot, email, nanny_email, status, invited_at, expires_at");
  // If the nanny columns have not been added yet, still show every seat that is in use.
  const result = full.error ? await query("id, slot, email, status, invited_at, expires_at") : full;
  return (result.data ?? []) as unknown as InviteRow[];
}

/** The nanny details on an invite, or nothing if those columns have not been added yet. */
async function nannyOf(inviteId: string) {
  const { data, error } = await supabaseAdmin.from("agency_invites").select("nanny_name, nanny_email").eq("id", inviteId).maybeSingle();
  return error || !data ? { nanny_name: null, nanny_email: null } : data;
}

/** What an agency may see: slots, the email it typed, and invite status. Never the family or its wallet. */
export async function getSeatBoard(agencyId: string) {
  await expireOld(agencyId);
  const [agency, rows] = await Promise.all([agencyInfo(agencyId), openInvites(agencyId)]);
  const seats = buildSeats(agency.allowance, rows);
  return {
    plan: agency.planName,
    total: seats.length,
    occupied: seats.filter((s) => s.state === "occupied").length,
    invited: seats.filter((s) => s.state === "invited").length,
    seats,
  };
}

async function emailInvite(agencyId: string, to: string, token: string) {
  const agency = await agencyInfo(agencyId);
  const name = agency.brand_name || agency.name;
  const { emailConfigured, sendEmail } = await import("./email.server");
  if (!emailConfigured()) return false;
  const { siteUrl, CONTACT_EMAIL } = await import("./site");
  const url = siteUrl(`/join/${token}`);
  const text = `${name} has set you up with a Family Wallet, a private place for your household's week, agreements, daily logs and more.\n\nActivate it here (the link works once and expires in ${INVITE_DAYS} days):\n${url}\n\nYour wallet is private to your family. ${name} cannot see what you add to it.\n\nQuestions? ${process.env["EMAIL_REPLY_TO"] || CONTACT_EMAIL}`;
  const html = `<p>${name} has set you up with a Family Wallet, a private place for your household's week, agreements, daily logs and more.</p><p><a href="${url}" style="display:inline-block;background:#1a382b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Activate my Family Wallet</a></p><p style="color:#57534e;font-size:14px">The link works once and expires in ${INVITE_DAYS} days. Your wallet is private to your family: ${name} cannot see what you add to it.</p>`;
  return sendEmail({ to, subject: `${name} has set you up with a Family Wallet`, html, text });
}

export async function sendSeatInvite(agencyId: string, slot: number, rawEmail: string, nanny?: { name?: string; email?: string }) {
  const email = normaliseEmail(rawEmail);
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
  // The nanny is optional. If the agency gives an email it needs a name too, so the nanny's email can greet them.
  const nannyEmail = normaliseEmail(nanny?.email ?? "");
  if (nannyEmail && !isValidEmail(nannyEmail)) throw new Error("Enter a valid email address for the nanny.");
  // Agencies only give an email, so the nanny starts with a name from it and the family can change it.
  const nannyName = (nanny?.name ?? "").trim().slice(0, 80) || nannyEmail.split("@")[0]!.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80);
  if (nannyEmail === email) throw new Error("The nanny needs their own email address.");
  await expireOld(agencyId);
  const [agency, rows] = await Promise.all([agencyInfo(agencyId), openInvites(agencyId)]);
  // Enforced here, on the server: a slot outside the purchased allowance is refused.
  if (!Number.isInteger(slot) || slot < 1 || slot > seatCount(agency.allowance, rows)) throw new Error("That seat isn't part of your plan.");
  if (rows.some((r) => r.slot === slot)) throw new Error("That seat is already in use.");
  if (rows.some((r) => normaliseEmail(r.email) === email)) throw new Error("That email already has a seat.");

  const token = newInviteToken();
  const { data: row, error } = await supabaseAdmin
    .from("agency_invites")
    .insert({
      agency_id: agencyId,
      slot,
      email,
      // Only sent when there is a nanny, so a plain invitation never depends on the nanny columns.
      ...(nannyEmail ? { nanny_email: nannyEmail, nanny_name: nannyName } : {}),
      token_hash: hashInviteToken(token),
      expires_at: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    console.error("Could not save a seat invitation", error.code, error.message);
    // 23505 is the database saying the seat or email really is taken; anything else is a different problem.
    if (error.code === "23505") throw new Error("That seat or email is already in use.");
    if (nannyEmail && /nanny_/.test(error.message)) throw new Error("Adding a nanny isn't available yet. Send the invitation without the nanny for now.");
    throw new Error("Couldn't save the invitation. Please try again, or contact support if it keeps happening.");
  }
  // The link goes to the family by email only. It is never shown to the agency, so the agency cannot claim it.
  if (!(await emailInvite(agencyId, email, token))) {
    await supabaseAdmin.from("agency_invites").delete().eq("id", row.id);
    throw new Error("The email couldn't be sent. Check the address and try again.");
  }
  return { ok: true as const };
}

async function ownPending(agencyId: string, inviteId: string) {
  const { data } = await supabaseAdmin.from("agency_invites").select("id, email, status").eq("id", inviteId).eq("agency_id", agencyId).maybeSingle();
  if (!data || data.status !== "pending") throw new Error("That invitation can't be changed.");
  return data;
}

export async function resendSeatInvite(agencyId: string, inviteId: string) {
  const invite = await ownPending(agencyId, inviteId);
  const token = newInviteToken();
  await supabaseAdmin
    .from("agency_invites")
    .update({ token_hash: hashInviteToken(token), expires_at: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString(), invited_at: new Date().toISOString() })
    .eq("id", invite.id);
  if (!(await emailInvite(agencyId, invite.email, token))) throw new Error("The email couldn't be sent. Try again in a minute.");
  return { ok: true as const };
}

export async function revokeSeatInvite(agencyId: string, inviteId: string) {
  const invite = await ownPending(agencyId, inviteId);
  await supabaseAdmin.from("agency_invites").update({ status: "revoked", token_hash: null }).eq("id", invite.id);
  return { ok: true as const };
}

/** The offer a family gets when its agency stops funding the wallet. */
async function emailContinuation(slug: string, to: string, familyName: string, agencyName: string, endsAt: Date) {
  const { emailConfigured, sendEmail } = await import("./email.server");
  if (!emailConfigured()) return false;
  const { siteUrl, CONTACT_EMAIL } = await import("./site");
  const url = siteUrl(`/continue/${slug}`);
  const until = endsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const text = `Hello ${familyName},

Your agency-funded Family Wallet access, provided by ${agencyName}, is coming to an end.

The good news is that you can continue using Family Wallet independently by taking out your own subscription. Keep your household information, nanny details, agreements, documents and everything you've already set up in one secure place. Nothing is lost and you don't need to set anything up again.

You keep full access until ${until}. To continue, choose your plan here:
${url}

Questions? ${process.env["EMAIL_REPLY_TO"] || CONTACT_EMAIL}`;
  const html = `<p>Hello ${familyName},</p><p>Your agency-funded Family Wallet access, provided by ${agencyName}, is coming to an end.</p><p>The good news is that you can continue using Family Wallet independently by taking out your own subscription. Keep your household information, nanny details, agreements, documents and everything you've already set up in one secure place. Nothing is lost and you don't need to set anything up again.</p><p>You keep full access until <strong>${until}</strong>.</p><p><a href="${url}" style="display:inline-block;background:#1a382b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Continue with Family Wallet</a></p>`;
  return sendEmail({ to, subject: "Keep your Family Wallet: choose how to continue", html, text });
}

/**
 * Ends the agency's funding of a household. The seat is free straight away. The family keeps its
 * account and data and gets a grace period, then a direct-subscription offer. It is never charged
 * automatically, and the grace period does not hold the agency's seat.
 */
export async function releaseSeat(agencyId: string, inviteId: string) {
  const { data: invite } = await supabaseAdmin
    .from("agency_invites")
    .select("id, status, family_id")
    .eq("id", inviteId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (!invite || invite.status !== "accepted") throw new Error("That seat isn't occupied.");
  const now = new Date();
  await supabaseAdmin.from("agency_invites").update({ status: "released", released_at: now.toISOString() }).eq("id", invite.id);
  if (!invite.family_id) return { ok: true as const };

  const { data: family } = await supabaseAdmin
    .from("families")
    .select("slug, family_name, contact_email, entitlement")
    .eq("id", invite.family_id)
    .maybeSingle();
  if (!family) return { ok: true as const };
  // A family that already pays for itself is left alone: only agency-funded households enter a transition.
  if (family.entitlement === "direct_active") {
    await supabaseAdmin.from("families").update({ agency_released_at: now.toISOString() }).eq("id", invite.family_id);
    return { ok: true as const };
  }
  const endsAt = transitionEnd(now, graceDays());
  await supabaseAdmin
    .from("families")
    .update({ agency_released_at: now.toISOString(), entitlement: "transition", transition_ends_at: endsAt.toISOString(), updated_at: now.toISOString() })
    .eq("id", invite.family_id);

  const to = (family.contact_email ?? "").trim();
  if (to) {
    const agency = await agencyInfo(agencyId);
    await emailContinuation(family.slug, to, family.family_name, agency.brand_name || agency.name, endsAt);
  }
  return { ok: true as const };
}

/* ---------------- Family side (public, token-based) ---------------- */

export async function lookupInvite(token: string) {
  const { data } = await supabaseAdmin
    .from("agency_invites")
    .select("id, agency_id, expires_at, status")
    .eq("token_hash", hashInviteToken(token))
    .eq("status", "pending")
    .maybeSingle();
  if (!data || (data.expires_at && new Date(data.expires_at).getTime() < Date.now())) return null;
  const agency = await agencyInfo(data.agency_id);
  return { agencyName: agency.brand_name || agency.name, nannyName: (await nannyOf(data.id)).nanny_name };
}

/** The family claims the seat once, creating its own wallet. The agency never receives the link or code. */
export async function acceptInvite(token: string, familyName: string) {
  const name = familyName.trim().slice(0, 80);
  if (!name) throw new Error("Please enter your family name.");
  // A single conditional update claims the invite, so a link can only ever be used once.
  const { data: claimed } = await supabaseAdmin
    .from("agency_invites")
    .update({ status: "accepted", token_hash: null, accepted_at: new Date().toISOString() })
    .eq("token_hash", hashInviteToken(token))
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .select("id, agency_id, email");
  const claimedRow = claimed?.[0];
  const invite = claimedRow ? { ...claimedRow, ...(await nannyOf(claimedRow.id)) } : undefined;
  if (!invite) throw new Error("This invitation has expired or was already used. Ask your agency to send a new one.");

  const { generateAccessCode, hashCode } = await import("./wallet.server");
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "family";
  const slug = `${base}-${generateAccessCode().slice(0, 4).toLowerCase()}`;
  const code = generateAccessCode();
  const { data: family, error } = await supabaseAdmin
    .from("families")
    .insert({
      family_name: name,
      contact_email: invite.email.endsWith(".invalid") ? null : invite.email,
      tier_band: "",
      status: "active",
      entitlement: "agency_active",
      partner_agency_id: invite.agency_id,
      slug,
      access_code: code,
      access_code_hash: hashCode(slug, code),
    })
    .select("id")
    .single();
  if (error) {
    await supabaseAdmin.from("agency_invites").update({ status: "revoked" }).eq("id", invite.id);
    throw new Error("We couldn't create your wallet. Ask your agency to send a new invitation.");
  }
  await supabaseAdmin.from("agency_invites").update({ family_id: family.id }).eq("id", invite.id);

  const { siteUrl, CONTACT_EMAIL } = await import("./site");
  const url = siteUrl(`/w/${slug}`);
  const { emailConfigured, sendEmail } = await import("./email.server");
  const agency = await agencyInfo(invite.agency_id);
  const agencyName = agency.brand_name || agency.name;
  if (emailConfigured() && !invite.email.endsWith(".invalid")) {
    const { buildWalletEmail } = await import("./wallet-email");
    await sendEmail({ to: invite.email, ...buildWalletEmail("invite", [{ familyName: name, url, code }], { agencyName }) });
  }

  // The nanny the agency named gets their own sign-in. The code is made here and emailed straight to
  // them; the agency never sees it, and a failure here never stops the family getting its wallet.
  let nannyName: string | null = null;
  if (invite.nanny_email && invite.nanny_name) {
    try {
      const nannyCode = generateAccessCode();
      const { error: nannyError } = await supabaseAdmin.from("family_nannies").insert({
        family_id: family.id,
        name: invite.nanny_name,
        sort_order: 0,
        nanny_code: nannyCode,
        nanny_code_hash: hashCode(`nanny:${slug}`, nannyCode),
        invited_at: new Date().toISOString(),
      });
      if (!nannyError) {
        await supabaseAdmin.from("families").update({ nanny_name: invite.nanny_name }).eq("id", family.id);
        nannyName = invite.nanny_name;
        if (emailConfigured()) {
          const { buildNannyInviteEmail } = await import("./nanny-invite-email");
          await sendEmail({
            to: invite.nanny_email,
            ...buildNannyInviteEmail({ nannyName: invite.nanny_name, familyName: name, agencyName, url: siteUrl(`/nanny/${slug}`), code: nannyCode, supportEmail: process.env["EMAIL_REPLY_TO"] || CONTACT_EMAIL }),
          });
        }
      }
    } catch (e) {
      console.error("Could not set up the nanny from the invite", e);
    }
  }
  return { url, code, slug, nannyName };
}
