import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Agency pages require a two-step (authenticator app) verified session.
export async function requireTwoStepClient() {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel !== "aal2") throw redirect({ to: "/auth" });
}
