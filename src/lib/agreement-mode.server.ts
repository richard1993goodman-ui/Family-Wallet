import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AgreementMode = {
  /** The nanny agreement is switched on for this family (both the agency and the family allow it). */
  enabled: boolean;
  /** The agency has turned agreements off for all its families, so the family cannot switch them on. */
  lockedByAgency: boolean;
};

export async function agreementMode(familyId: string): Promise<AgreementMode> {
  const { data } = await supabaseAdmin
    .from("families")
    .select("use_agreement, partner_agency:partner_agencies(agreements_enabled)")
    .eq("id", familyId)
    .maybeSingle();
  const lockedByAgency = data?.partner_agency?.agreements_enabled === false;
  return { enabled: !lockedByAgency && data?.use_agreement !== false, lockedByAgency };
}
