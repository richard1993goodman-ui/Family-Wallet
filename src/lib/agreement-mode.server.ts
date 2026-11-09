import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveAgreementMode, type AgreementMode } from "./agreement-mode";

export type { AgreementMode };

export async function agreementMode(familyId: string): Promise<AgreementMode> {
  const { data } = await supabaseAdmin
    .from("families")
    .select("use_agreement, agreement_policy, partner_agency:partner_agencies(agreements_enabled)")
    .eq("id", familyId)
    .maybeSingle();
  return resolveAgreementMode({
    policy: data?.agreement_policy,
    useAgreement: data?.use_agreement,
    agencyEnabled: data?.partner_agency?.agreements_enabled,
  });
}
