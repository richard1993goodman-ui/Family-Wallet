import type { getAgreement } from "@/lib/agreement.functions";
import type { getHubSummary } from "@/lib/family.functions";
import type { getWalletSummary } from "@/lib/wallet.functions";

type WalletSummary = Awaited<ReturnType<typeof getWalletSummary>>;

export type DashboardWallet = Extract<WalletSummary, { unlocked: true }>["wallet"];
export type HubSummary = NonNullable<Awaited<ReturnType<typeof getHubSummary>>>;
export type AgreementSummary = Awaited<ReturnType<typeof getAgreement>>;

export type OutstandingAgreement = {
  id: string;
  name: string;
  agreementStatus: string;
};

/** Everything the home dashboards need, loaded once by the /w/$slug route. */
export type DashboardProps = {
  slug: string;
  wallet: DashboardWallet;
  hub: HubSummary | null;
  agreement: AgreementSummary | null;
  agreementDone: boolean;
  agreementSubtitle: string;
  nannyCount: number;
  outstandingAgreements: OutstandingAgreement[];
  openDoc: (docType: string) => void;
  onLock: () => void;
};
