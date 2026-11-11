import { resolveAgreementMode } from "./agreement-mode";
import { transitionExpired, walletOpen } from "./entitlement";
import { createHash, timingSafeEqual } from "node:crypto";
import { useSession, getRequest } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type WalletSession = { unlocked?: string[] };

function sessionConfig() {
  return {
    password: process.env["WALLET_SESSION_SECRET"]!,
    name: "family-wallet",
    // Remember this device for a year, refreshed on every visit.
    maxAge: 60 * 60 * 24 * 365,
    // "none" so the wallet stays unlocked when the app is viewed inside an
    // embedded preview frame; the cookie is still httpOnly and https-only.
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

/** Re-issues the cookie so an active family keeps a rolling 12-month session. */
export async function touchWalletSession() {
  try {
    const session = await walletSession();
    const unlocked = session.data.unlocked ?? [];
    if (unlocked.length === 0) return;
    await session.update({ unlocked });
  } catch {
    /* ignore */
  }
}


export function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashCode(slug: string, code: string) {
  const pepper = process.env["WALLET_CODE_PEPPER"] ?? "";
  return createHash("sha256").update(`${slug}:${normalizeCode(code)}:${pepper}`).digest("hex");
}

function equals(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function generateAccessCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

async function walletSession() {
  return useSession<WalletSession>(sessionConfig());
}

/**
 * The one place a household's funding is enforced for sessions. A wallet is open only while it is
 * active and, if it is in an agency-release transition, inside its grace period. When the grace
 * period has run out the wallet is suspended here, so no cron job is needed and an old session
 * stops working the next time it asks for anything. Unmanaged (null entitlement) families pass.
 */
async function fundingOpen(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("families")
    .select("id, status, entitlement, transition_ends_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    // The funding columns may not exist yet (migration not applied): fall back to the plain status check.
    const { data: plain } = await supabaseAdmin.from("families").select("status").eq("slug", slug).maybeSingle();
    return plain?.status === "active";
  }
  if (!data) return false;
  if (transitionExpired(data.entitlement, data.transition_ends_at) && data.status === "active") {
    await supabaseAdmin
      .from("families")
      .update({ status: "suspended", entitlement: "suspended", updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("entitlement", "transition");
    return false;
  }
  return walletOpen(data.status, data.entitlement, data.transition_ends_at);
}

export async function isUnlocked(slug: string) {
  // The sample "demo" wallet is fictional and open to anyone — no code needed.
  if (slug === "demo") return true;
  const session = await walletSession();
  if (!(session.data.unlocked ?? []).includes(slug)) return false;
  return fundingOpen(slug);
}

/** True when this device has entered the family's code, even if the wallet is now suspended. */
export async function hasCredential(slug: string) {
  const session = await walletSession();
  return (session.data.unlocked ?? []).includes(slug);
}

/** For the family's own "continue with Family Wallet" page. Null unless this device holds the code. */
export async function continuationFor(slug: string) {
  if (slug === "demo" || !(await hasCredential(slug))) return null;
  const { data } = await supabaseAdmin
    .from("families")
    .select("family_name, status, entitlement, transition_ends_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  if (transitionExpired(data.entitlement, data.transition_ends_at) && data.status === "active") await fundingOpen(slug);
  const { data: fresh } = await supabaseAdmin
    .from("families")
    .select("family_name, status, entitlement, transition_ends_at")
    .eq("slug", slug)
    .maybeSingle();
  const row = fresh ?? data;
  return {
    familyName: row.family_name,
    // Only these two states can be offered a direct subscription.
    state: row.entitlement === "transition" ? ("transition" as const) : row.status === "suspended" ? ("suspended" as const) : ("none" as const),
    endsAt: row.transition_ends_at,
  };
}

export async function markUnlocked(slug: string) {
  const session = await walletSession();
  const current = session.data.unlocked ?? [];
  if (!current.includes(slug)) {
    await session.update({ unlocked: [...current, slug] });
  }
}

export async function lockWallet(slug: string) {
  const session = await walletSession();
  const current = session.data.unlocked ?? [];
  await session.update({ unlocked: current.filter((s) => s !== slug) });
}

function clientKey() {
  try {
    const request = getRequest();
    const forwarded = request.headers.get("x-forwarded-for") ?? "";
    return (forwarded.split(",")[0] || request.headers.get("cf-connecting-ip") || "unknown").trim();
  } catch {
    return "unknown";
  }
}

export async function attemptUnlock(slug: string, code: string) {
  const key = `${clientKey()}|${slug}`;
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from("wallet_access_attempts")
    .select("id", { count: "exact", head: true })
    .eq("client_key", key)
    .eq("succeeded", false)
    .gte("attempted_at", since);

  if ((count ?? 0) >= 8) {
    return { ok: false as const, reason: "rate_limited" as const };
  }

  const { data: family } = await supabaseAdmin
    .from("families")
    .select("slug, access_code_hash, status")
    .eq("slug", slug)
    .maybeSingle();

  const success =
    // A suspended family can still prove who it is, so it can reach the page that reactivates its wallet.
    !!family && (family.status === "active" || family.status === "suspended") && equals(family.access_code_hash, hashCode(slug, code));

  await supabaseAdmin
    .from("wallet_access_attempts")
    .insert({ slug, client_key: key, succeeded: success });

  if (!success) return { ok: false as const, reason: "invalid" as const };

  // The code has done its job: stop keeping a readable copy.
  await supabaseAdmin.from("families").update({ access_code: null }).eq("slug", slug);
  await markUnlocked(slug);
  return { ok: true as const };
}

export const DEMO_SLUG = "demo";

/** Only ever unlocks the demo wallet — never a real family. */
export async function openDemo() {
  const { data } = await supabaseAdmin
    .from("families")
    .select("slug")
    .eq("slug", DEMO_SLUG)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return { ok: false as const };
  await markUnlocked(DEMO_SLUG);
  return { ok: true as const };
}

/* ---------------- Nanny invitation & sign-in ---------------- */

/** Codes are hashed against the family (not the individual) so older invites keep working. */
const nannyKey = (slug: string) => `nanny:${slug}`;
const nannySessionKey = (slug: string, nannyId: string) => `nanny:${slug}:${nannyId}`;

export type NannyRecord = {
  id: string;
  name: string;
  bio: string | null;
  photoPath: string | null;
  emergency: WalletContact | null;
  code: string | null;
  invitedAt: string | null;
};

async function familyRowBySlug(slug: string) {
  const { data } = await supabaseAdmin
    .from("families")
    .select("id, family_name, status")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!data || !(await fundingOpen(slug))) return null;
  return data;
}

export async function listNannyRows(familyId: string) {
  const { data } = await supabaseAdmin
    .from("family_nannies")
    .select(
      "id, name, role, bio, photo_path, emergency_name, emergency_relationship, emergency_phone, nanny_code, invited_at, status",
    )
    .eq("family_id", familyId)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

/** Which nanny (if any) this device is signed in as. */
async function sessionNannyId(slug: string, familyId: string): Promise<string | null> {
  const session = await walletSession();
  const unlocked = session.data.unlocked ?? [];
  const prefix = `${nannySessionKey(slug, "")}`;
  const direct = unlocked.find((entry) => entry.startsWith(prefix) && entry.length > prefix.length);
  const rows = await listNannyRows(familyId);
  if (direct) {
    const id = direct.slice(prefix.length);
    return rows.some((r) => r.id === id) ? id : null;
  }
  // Legacy sessions signed in before families could have more than one nanny.
  if (unlocked.includes(nannyKey(slug))) return rows[0]?.id ?? null;
  return null;
}

export async function isNannyUnlocked(slug: string) {
  const family = await familyRowBySlug(slug);
  if (!family) return false;
  return (await sessionNannyId(slug, family.id)) !== null;
}

/** "family" = parent/wallet holder, "nanny" = invited nanny, null = no access. */
export async function accessLevel(slug: string): Promise<"family" | "nanny" | null> {
  const session = await sessionAccess(slug);
  return session?.level ?? null;
}

export async function sessionAccess(
  slug: string,
): Promise<{ level: "family" | "nanny"; nannyId: string | null } | null> {
  if (await isUnlocked(slug)) return { level: "family", nannyId: null };
  const family = await familyRowBySlug(slug);
  if (!family) return null;
  const nannyId = await sessionNannyId(slug, family.id);
  return nannyId ? { level: "nanny", nannyId } : null;
}

/** Parents generate (or refresh) the invite code for one of their nannies. */
export async function ensureNannyInvite(slug: string, nannyId: string, regenerate = false) {
  if (!(await isUnlocked(slug))) return null;
  const family = await familyRowBySlug(slug);
  if (!family) return null;

  const { data: nanny } = await supabaseAdmin
    .from("family_nannies")
    .select("id, name, nanny_code, nanny_code_hash")
    .eq("id", nannyId)
    .eq("family_id", family.id)
    .maybeSingle();
  if (!nanny) return null;

  // A code already in use is only stored as a hash, so it can't be shown again: regenerate to get a new one.
  let code = nanny.nanny_code;
  if (regenerate || (!code && !nanny.nanny_code_hash)) {
    code = generateAccessCode();
    const { error } = await supabaseAdmin
      .from("family_nannies")
      .update({
        nanny_code: code,
        nanny_code_hash: hashCode(nannyKey(slug), code),
        invited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", nanny.id);
    if (error) return null;
  }

  if (!code) return null;
  return { code, slug, nannyId: nanny.id, nannyName: nanny.name };
}

export async function attemptNannyUnlock(slug: string, code: string) {
  const key = `${clientKey()}|nanny|${slug}`;
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from("wallet_access_attempts")
    .select("id", { count: "exact", head: true })
    .eq("client_key", key)
    .eq("succeeded", false)
    .gte("attempted_at", since);
  if ((count ?? 0) >= 8) return { ok: false as const, reason: "rate_limited" as const };

  const family = await familyRowBySlug(slug);
  const attempted = family ? hashCode(nannyKey(slug), code) : "";

  let matched: { id: string } | null = null;
  if (family) {
    const { data: rows } = await supabaseAdmin
      .from("family_nannies")
      .select("id, nanny_code_hash")
      .eq("family_id", family.id)
      .eq("status", "active");
    matched =
      (rows ?? []).find((r) => r.nanny_code_hash && equals(r.nanny_code_hash, attempted)) ?? null;
  }

  await supabaseAdmin
    .from("wallet_access_attempts")
    .insert({ slug: nannyKey(slug), client_key: key, succeeded: !!matched });

  if (!matched) return { ok: false as const, reason: "invalid" as const };

  // The code has done its job: stop keeping a readable copy.
  await supabaseAdmin.from("family_nannies").update({ nanny_code: null }).eq("id", matched.id);
  const session = await walletSession();
  const current = session.data.unlocked ?? [];
  const entry = nannySessionKey(slug, matched.id);
  if (!current.includes(entry)) {
    await session.update({ unlocked: [...current, entry] });
  }
  return { ok: true as const };
}

export type WalletCheck = {
  docType: string;
  fileName: string;
  visibility: "document" | "badge";
  issuedOn: string | null;
  referenceLabel: string | null;
};

export type WalletContact = { name: string; relationship: string | null; phone: string };

export type WalletNanny = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  /** What they do in the household: nanny, au_pair, housekeeper and so on. */
  role: string;
  emergency: WalletContact | null;
  isYou: boolean;
};

export type WalletData = {
  access: "family" | "nanny";
  familyName: string;
  /** Partner agency running this wallet; null = owner agency. */
  agencyName: string | null;
  agencyLogo?: string | null;
  tierBand: string;
  nannies: WalletNanny[];
  nannytaxCode: string | null;
  startDate: string | null;
  termsAcceptedOn: string | null;
  hasTerms: boolean;
  /** The nanny agreement is in use for this household. */
  agreementsEnabled: boolean;
  /** How the parents chose to handle the nanny arrangement; null until they choose on first sign-in. */
  agreementChoice: "template" | "self_employed" | "none" | null;
  /** The agency turned agreements off, so the family cannot switch them on. */
  agreementsLockedByAgency: boolean;
  updatedAt: string;
  contacts: WalletContact[];
  documents: { docType: string; fileName: string }[];
  checks: WalletCheck[];
};

export async function loadWallet(slug: string): Promise<WalletData | null> {
  const session = await sessionAccess(slug);
  if (!session) return null;
  await touchWalletSession();
  const access = session.level;


  const { data: family } = await supabaseAdmin
    .from("families")
    .select("id, family_name, tier_band, nannytax_code, start_date, terms_accepted_on, status, updated_at, use_agreement, agreement_policy")
    .eq("slug", slug)
    .maybeSingle();

  if (!family || family.status !== "active") return null;
  // Read separately so a wallet still opens if this column has not been added yet.
  const { data: choiceRow } = await supabaseAdmin.from("families").select("agreement_choice").eq("id", family.id).maybeSingle();
  const agreement = resolveAgreementMode({
    policy: family.agreement_policy,
    useAgreement: family.use_agreement,
    agencyEnabled: undefined,
  });

  const [{ data: docs }, { data: contactRows }, nannyRows] = await Promise.all([
    supabaseAdmin
      .from("family_documents")
      .select("doc_type, file_name, visibility, issued_on, reference_label")
      .eq("family_id", family.id),
    supabaseAdmin
      .from("family_contacts")
      .select("name, relationship, phone")
      .eq("family_id", family.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    listNannyRows(family.id),
  ]);

  const nannies: WalletNanny[] = await Promise.all(
    nannyRows.map(async (row) => {
      let photoUrl: string | null = null;
      if (row.photo_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("family-docs")
          .createSignedUrl(row.photo_path, 300);
        photoUrl = signed?.signedUrl ?? null;
      }
      return {
        id: row.id,
        name: row.name,
        bio: row.bio,
        photoUrl,
        role: row.role,
        emergency: row.emergency_name
          ? {
              name: row.emergency_name,
              relationship: row.emergency_relationship,
              phone: row.emergency_phone ?? "",
            }
          : null,
        isYou: session.nannyId === row.id,
      };
    }),
  );

  const visible = (docs ?? []).filter((d) => d.visibility !== "hidden");

  return {
    access,
    familyName: family.family_name,
    // Agencies hand out seats only: no agency name or logo is shown inside a family's wallet.
    agencyName: null,
    agencyLogo: null,
    tierBand: access === "family" ? family.tier_band : "",
    nannies,
    nannytaxCode: access === "family" ? family.nannytax_code : null,
    startDate: access === "family" ? family.start_date : null,
    termsAcceptedOn: access === "family" ? family.terms_accepted_on : null,
    hasTerms: access === "family" ? Boolean(await (await import("./agency-terms.server")).termsForFamily(family.id)) : false,
    agreementsEnabled: agreement.enabled,
    agreementChoice: ((c) => (c === "template" || c === "self_employed" || c === "none" ? c : null))(choiceRow?.agreement_choice),
    agreementsLockedByAgency: agreement.lockedByAgency,
    updatedAt: family.updated_at,
    contacts: (contactRows ?? []).map((c) => ({
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
    })),
    documents: (access === "family" ? visible : [])
      .filter((d) => d.visibility === "document")
      .map((d) => ({ docType: d.doc_type, fileName: d.file_name })),
    checks: (access === "family" ? visible : [])
      .filter((d) => ["dbs", "id_check", "reference_1", "reference_2"].includes(d.doc_type))
      .map((d) => ({
        docType: d.doc_type,
        fileName: d.file_name,
        visibility: d.visibility as "document" | "badge",
        issuedOn: d.issued_on,
        referenceLabel: d.reference_label,
      })),
  };
}

export async function walletExists(slug: string) {
  const { data } = await supabaseAdmin
    .from("families")
    .select("family_name")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return data?.family_name ?? null;
}

/** The name of a paused (suspended) wallet, so its family can be sent to the page that restarts it. */
export async function suspendedWalletName(slug: string) {
  const { data } = await supabaseAdmin
    .from("families")
    .select("family_name")
    .eq("slug", slug)
    .eq("status", "suspended")
    .maybeSingle();
  return data?.family_name ?? null;
}

export async function documentUrl(slug: string, docType: string) {
  if (!(await isUnlocked(slug))) return null;

  const { data: family } = await supabaseAdmin
    .from("families")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!family) return null;

  const { data: doc } = await supabaseAdmin
    .from("family_documents")
    .select("storage_path, visibility")
    .eq("family_id", family.id)
    .eq("doc_type", docType)
    .maybeSingle();
  if (!doc || doc.visibility !== "document") return null;

  const { data: signed } = await supabaseAdmin.storage
    .from("family-docs")
    .createSignedUrl(doc.storage_path, 300);

  return signed?.signedUrl ?? null;
}

/* ---------------- Device pairing (one-time PIN) ---------------- */

const PAIR_PIN_MINUTES = 10;

/** A signed-in family makes a fresh PIN; any earlier unused PIN stops working. */
export async function createPairPin(slug: string) {
  if (slug === DEMO_SLUG || !(await isUnlocked(slug))) return null;
  await supabaseAdmin.from("wallet_pair_pins").delete().eq("slug", slug).is("used_at", null);
  const pin = generateAccessCode();
  const expiresAt = new Date(Date.now() + PAIR_PIN_MINUTES * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from("wallet_pair_pins")
    .insert({ slug, pin_hash: hashCode(slug, pin), expires_at: expiresAt });
  if (error) throw new Error("Could not create a PIN.");
  return { pin, expiresAt };
}

/** Trades a valid PIN for family access on this device. Shares the unlock rate limit. */
export async function redeemPairPin(slug: string, pin: string) {
  const key = `${clientKey()}|${slug}`;
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("wallet_access_attempts")
    .select("id", { count: "exact", head: true })
    .eq("client_key", key)
    .eq("succeeded", false)
    .gte("attempted_at", since);
  if ((count ?? 0) >= 8) return { ok: false as const, reason: "rate_limited" as const };

  // The update only matches an unused, unexpired PIN, so a PIN can be redeemed once.
  const { data } = await supabaseAdmin
    .from("wallet_pair_pins")
    .update({ used_at: new Date().toISOString() })
    .eq("slug", slug)
    .eq("pin_hash", hashCode(slug, pin))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id");
  const success = (data?.length ?? 0) > 0;

  await supabaseAdmin.from("wallet_access_attempts").insert({ slug, client_key: key, succeeded: success });
  if (!success) return { ok: false as const, reason: "invalid" as const };

  await markUnlocked(slug);
  return { ok: true as const };
}
