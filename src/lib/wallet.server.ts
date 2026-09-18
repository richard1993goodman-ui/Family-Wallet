import { createHash, timingSafeEqual } from "node:crypto";
import { useSession, getRequest } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type WalletSession = { unlocked?: string[] };

function sessionConfig() {
  return {
    password: process.env["WALLET_SESSION_SECRET"]!,
    name: "family-wallet",
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
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

export async function isUnlocked(slug: string) {
  const session = await walletSession();
  return (session.data.unlocked ?? []).includes(slug);
}

async function markUnlocked(slug: string) {
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
    !!family && family.status === "active" && equals(family.access_code_hash, hashCode(slug, code));

  await supabaseAdmin
    .from("wallet_access_attempts")
    .insert({ slug, client_key: key, succeeded: success });

  if (!success) return { ok: false as const, reason: "invalid" as const };

  await markUnlocked(slug);
  return { ok: true as const };
}

export type WalletData = {
  familyName: string;
  tierBand: string;
  nannyName: string | null;
  startDate: string | null;
  termsAcceptedOn: string | null;
  documents: { docType: string; fileName: string }[];
};

export async function loadWallet(slug: string): Promise<WalletData | null> {
  if (!(await isUnlocked(slug))) return null;

  const { data: family } = await supabaseAdmin
    .from("families")
    .select("id, family_name, tier_band, nanny_name, start_date, terms_accepted_on, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!family || family.status !== "active") return null;

  const { data: docs } = await supabaseAdmin
    .from("family_documents")
    .select("doc_type, file_name")
    .eq("family_id", family.id);

  return {
    familyName: family.family_name,
    tierBand: family.tier_band,
    nannyName: family.nanny_name,
    startDate: family.start_date,
    termsAcceptedOn: family.terms_accepted_on,
    documents: (docs ?? []).map((d) => ({ docType: d.doc_type, fileName: d.file_name })),
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
    .select("storage_path")
    .eq("family_id", family.id)
    .eq("doc_type", docType)
    .maybeSingle();
  if (!doc) return null;

  const { data: signed } = await supabaseAdmin.storage
    .from("family-docs")
    .createSignedUrl(doc.storage_path, 300);

  return signed?.signedUrl ?? null;
}
