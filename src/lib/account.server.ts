import { createHash, randomBytes } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { accessFromMembership, type Membership } from "./access";
import { buildClaimEmail } from "./account-email";
import { canLinkByEmail, likeLiteral } from "./account-link";

/** Accounts are off until this is "true", so nothing reaches users before it is switched on. */
export const accountsEnabled = () => process.env["ACCOUNTS_ENABLED"] === "true";

export const CLAIM_MINUTES = 30;
const CLAIMS_PER_HOUR = 5;

export const newClaimToken = () => randomBytes(32).toString("base64url");
export const hashClaimToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;

type Member = Membership & { id: string; familyId: string };

/** The person behind this request's Supabase login, if any. Memoised per request: access checks run many times. */
const people = new WeakMap<Request, Promise<string | null>>();
async function personForRequest(): Promise<string | null> {
  const request = getRequest();
  const token = request?.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!request || !token) return null;
  let found = people.get(request);
  if (!found) {
    found = (async () => {
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (!data.user) return null;
      const { data: person } = await supabaseAdmin
        .from("people")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      return person?.id ?? null;
    })();
    people.set(request, found);
  }
  return found;
}

/** This request's account membership in the household, or null. */
export async function accountMember(slug: string): Promise<Member | null> {
  if (!accountsEnabled() || slug === "demo") return null;
  const personId = await personForRequest();
  if (!personId) return null;
  const { data: family } = await supabaseAdmin
    .from("families")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!family) return null;
  const { data } = await supabaseAdmin
    .from("household_members")
    .select("id, family_id, role, status, nanny_id")
    .eq("family_id", family.id)
    .eq("person_id", personId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    familyId: data.family_id,
    role: data.role as Member["role"],
    status: data.status as Member["status"],
    nannyId: data.nanny_id,
  };
}

/** The email of the signed-in account, when it has an active membership in this household. Used to tie a signature to it. */
export async function signedInEmail(slug: string): Promise<string | null> {
  if (!(await accountMember(slug))) return null;
  const token = getRequest()
    ?.headers.get("authorization")
    ?.replace(/^Bearer /i, "");
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.email?.toLowerCase() ?? null;
}

/** What the account login grants in this household, or null. */
export async function accountAccess(slug: string) {
  return accessFromMembership(await accountMember(slug));
}

/** The household's membership for whoever is signed in with a code on this device. */
async function codeSessionMember(slug: string) {
  const { sessionAccess } = await import("./wallet.server");
  const access = await sessionAccess(slug);
  if (!access) return null;
  const { data: family } = await supabaseAdmin
    .from("families")
    .select("id, family_name")
    .eq("slug", slug)
    .maybeSingle();
  if (!family) return null;
  const query = supabaseAdmin
    .from("household_members")
    .select("id, person_id")
    .eq("family_id", family.id);
  const { data: member } =
    access.level === "nanny" && access.nannyId
      ? await query.eq("nanny_id", access.nannyId).maybeSingle()
      : await query.eq("role", "owner").maybeSingle();
  if (!member) return null;
  let name = family.family_name;
  if (access.level === "nanny" && access.nannyId) {
    const { data: nanny } = await supabaseAdmin
      .from("family_nannies")
      .select("name")
      .eq("id", access.nannyId)
      .maybeSingle();
    name = nanny?.name ?? name;
  }
  return { id: member.id, claimed: !!member.person_id, familyName: family.family_name, name };
}

/** What the "create your own login" card needs to know. */
export async function accountStatus(slug: string) {
  if (!accountsEnabled()) return { enabled: false as const };
  const member = await codeSessionMember(slug);
  return {
    enabled: true as const,
    canClaim: !!member && !member.claimed,
    claimed: !!member?.claimed,
  };
}

/** Emails a one-time link to the address given. Needs an unlocked wallet on this device. */
export async function startClaim(slug: string, rawEmail: string) {
  if (!accountsEnabled()) throw new Error("Accounts aren't available yet.");
  const email = rawEmail.trim().toLowerCase();
  if (!isEmail(email)) throw new Error("Enter a valid email address.");
  const member = await codeSessionMember(slug);
  if (!member) throw new Error("Please open your wallet first.");
  if (member.claimed) throw new Error("You already have a login.");

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("account_claims")
    .select("id", { count: "exact", head: true })
    .eq("member_id", member.id)
    .gte("created_at", since);
  if ((count ?? 0) >= CLAIMS_PER_HOUR)
    throw new Error("That's a lot of emails. Please try again in an hour.");

  const { emailConfigured, sendEmail } = await import("./email.server");
  if (!emailConfigured())
    throw new Error("Email isn't set up yet, so a login can't be created right now.");

  const token = newClaimToken();
  const { error } = await supabaseAdmin.from("account_claims").insert({
    member_id: member.id,
    token_hash: hashClaimToken(token),
    email,
    expires_at: new Date(Date.now() + CLAIM_MINUTES * 60 * 1000).toISOString(),
  });
  if (error) throw new Error("We couldn't start that. Please try again.");

  const { siteUrl } = await import("./site");
  const message = buildClaimEmail({
    name: member.name,
    familyName: member.familyName,
    url: siteUrl(`/claim/${token}`),
    minutes: CLAIM_MINUTES,
  });
  if (!(await sendEmail({ to: email, ...message })))
    throw new Error("The email couldn't be sent. Check the address and try again.");
  return { ok: true as const };
}

/** Uses a claim link once: creates the person, attaches them to the membership, and returns a sign-in link. */
export async function completeClaim(token: string) {
  if (!accountsEnabled()) throw new Error("Accounts aren't available yet.");
  const { data: claim } = await supabaseAdmin
    .from("account_claims")
    .select("id, member_id, email, expires_at, used_at")
    .eq("token_hash", hashClaimToken(token))
    .maybeSingle();
  if (
    !claim ||
    claim.used_at ||
    !claim.email ||
    new Date(claim.expires_at).getTime() < Date.now()
  ) {
    throw new Error(
      "This link has expired or was already used. Ask for a new one from inside your wallet.",
    );
  }
  // Single use: only one request can flip used_at.
  const { data: used } = await supabaseAdmin
    .from("account_claims")
    .update({ used_at: new Date().toISOString() })
    .eq("id", claim.id)
    .is("used_at", null)
    .select("id");
  if (!used?.length) throw new Error("This link was already used.");

  const { data: member } = await supabaseAdmin
    .from("household_members")
    .select("id, family_id, role, nanny_id, person_id")
    .eq("id", claim.member_id)
    .maybeSingle();
  if (!member || member.person_id) throw new Error("This household member already has a login.");

  const { siteUrl } = await import("./site");
  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: claim.email,
    options: { redirectTo: siteUrl("/account") },
  });
  if (linkError || !link.user) throw new Error("We couldn't create your login. Please try again.");

  let { data: person } = await supabaseAdmin
    .from("people")
    .select("id")
    .eq("user_id", link.user.id)
    .maybeSingle();
  if (!person) {
    const name = await displayName(member);
    const inserted = await supabaseAdmin
      .from("people")
      .insert({ user_id: link.user.id, display_name: name })
      .select("id")
      .single();
    if (inserted.error) throw new Error("We couldn't create your login. Please try again.");
    person = inserted.data;
  }
  const { error } = await supabaseAdmin
    .from("household_members")
    .update({ person_id: person.id })
    .eq("id", member.id)
    .is("person_id", null);
  if (error) throw new Error("You already belong to this household with another login.");

  const { audit } = await import("./audit.server");
  await audit({
    actorKind: member.role === "staff" ? "nanny" : "parent",
    actorId: person.id,
    action: "account_claimed",
    familyId: member.family_id,
  });
  return { actionLink: link.properties.action_link };
}

async function displayName(member: { family_id: string; nanny_id: string | null }) {
  if (member.nanny_id) {
    const { data } = await supabaseAdmin
      .from("family_nannies")
      .select("name")
      .eq("id", member.nanny_id)
      .maybeSingle();
    if (data?.name) return data.name;
  }
  const { data } = await supabaseAdmin
    .from("families")
    .select("family_name")
    .eq("id", member.family_id)
    .maybeSingle();
  return data?.family_name ?? "Family Wallet member";
}

/** The signed-in account's email, and whether Supabase has verified it. */
async function accountEmailFor(userId: string) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const user = data.user;
  return { email: user?.email?.toLowerCase() ?? null, verified: !!user?.email_confirmed_at };
}

/**
 * Wallets this signed-in person can be offered because they proved they own the family's contact email (set at
 * checkout, or by an agency) and nobody has an owner login on it yet. Each offer is shown to the person to confirm.
 */
export async function walletsForEmail(userId: string) {
  if (!accountsEnabled()) return [];
  const { email, verified } = await accountEmailFor(userId);
  if (!email || !verified) return [];
  const { data: families } = await supabaseAdmin
    .from("families")
    .select("id, slug, family_name, contact_email, status")
    .ilike("contact_email", likeLiteral(email))
    .limit(10);
  const offers: { id: string; slug: string; familyName: string; ownerMemberId: string }[] = [];
  for (const f of families ?? []) {
    let { data: owners } = await supabaseAdmin
      .from("household_members")
      .select("id, person_id")
      .eq("family_id", f.id)
      .eq("role", "owner");
    // Wallets made after the first backfill (checkout, agency invite) have no owner row yet: add the unclaimed one.
    if (!owners?.length && f.status === "active") {
      const created = await supabaseAdmin
        .from("household_members")
        .insert({ family_id: f.id, role: "owner", status: "active" })
        .select("id, person_id");
      owners = created.data;
    }
    // More than one owner row is ambiguous, so nothing is offered.
    const owner = owners?.length === 1 ? owners[0]! : null;
    if (
      owner &&
      canLinkByEmail({
        accountEmail: email,
        emailVerified: verified,
        contactEmail: f.contact_email,
        familyStatus: f.status,
        owner: { personId: owner.person_id },
      })
    ) {
      offers.push({ id: f.id, slug: f.slug, familyName: f.family_name, ownerMemberId: owner.id });
    }
  }
  return offers;
}

/** Attaches the signed-in person to a wallet they were offered. Re-checks everything; never trusts the client. */
export async function linkWalletByEmail(userId: string, familyId: string) {
  const offer = (await walletsForEmail(userId)).find((o) => o.id === familyId);
  if (!offer) throw new Error("We couldn't find a wallet for your email.");

  let { data: person } = await supabaseAdmin
    .from("people")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!person) {
    const inserted = await supabaseAdmin
      .from("people")
      .insert({ user_id: userId, display_name: offer.familyName })
      .select("id")
      .single();
    if (inserted.error) throw new Error("We couldn't set up your login. Please try again.");
    person = inserted.data;
  }
  // Only succeeds while the owner still has no login, so two people cannot both take it.
  const { data: linked } = await supabaseAdmin
    .from("household_members")
    .update({ person_id: person.id })
    .eq("id", offer.ownerMemberId)
    .is("person_id", null)
    .select("id");
  if (!linked?.length) throw new Error("This wallet already has a login.");

  const { audit } = await import("./audit.server");
  await audit({
    actorKind: "parent",
    actorId: person.id,
    action: "account_linked_by_email",
    familyId: offer.id,
  });
  return { slug: offer.slug };
}

/** Every household the signed-in person belongs to, for the account home page. */
export async function householdsFor(userId: string) {
  const { data: person } = await supabaseAdmin
    .from("people")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!person) return [];
  const { data } = await supabaseAdmin
    .from("household_members")
    .select("role, status, families(slug, family_name)")
    .eq("person_id", person.id)
    .eq("status", "active");
  return (data ?? [])
    .filter((m) => m.families)
    .map((m) => {
      const f = m.families as unknown as { slug: string; family_name: string };
      return { slug: f.slug, familyName: f.family_name, role: m.role as string };
    });
}
