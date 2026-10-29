import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type PartnerBrand = { handle: string; walletName: string; agencyName: string };

/** Public: returns only the display name of an active partner agency for its branded pages. */
export const getPartnerBrand = createServerFn({ method: "GET" })
  .inputValidator((d: { handle: string }) => ({ handle: String(d.handle ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) }))
  .handler(async ({ data }): Promise<PartnerBrand | null> => {
    if (!data.handle) return null;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await client.rpc("get_partner_brand" as never, { _handle: data.handle } as never);
    if (error) {
      console.error("get_partner_brand failed", error.message);
      return null;
    }
    const row = (rows as unknown as { handle: string; wallet_name: string; agency_name: string }[] | null)?.[0];
    return row ? { handle: row.handle, walletName: row.wallet_name, agencyName: row.agency_name } : null;
  });
