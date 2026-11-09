export type AgreementPolicy = "family" | "on" | "off";

export const isAgreementPolicy = (value: unknown): value is AgreementPolicy =>
  value === "family" || value === "on" || value === "off";

export type AgreementMode = {
  /** The nanny agreement is switched on for this family. */
  enabled: boolean;
  /** Set by the agency, so the parents cannot change it. */
  lockedByAgency: boolean;
};

/**
 * What a family sees. The agency's choice for that family wins, then the agency-wide setting
 * (off = off for everyone it hasn't switched on), and only then the parents' own choice.
 */
export function resolveAgreementMode(input: {
  policy: unknown;
  useAgreement: boolean | null | undefined;
  agencyEnabled: boolean | null | undefined;
}): AgreementMode {
  const policy = isAgreementPolicy(input.policy) ? input.policy : "family";
  if (policy === "on") return { enabled: true, lockedByAgency: true };
  if (policy === "off") return { enabled: false, lockedByAgency: true };
  if (input.agencyEnabled === false) return { enabled: false, lockedByAgency: true };
  return { enabled: input.useAgreement !== false, lockedByAgency: false };
}
