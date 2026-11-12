import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { ActionRow, SectionTitle } from "@/components/dashboard/tiles";
import { HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { navFor, routePrefix } from "@/components/wallet-nav";
import { getHubSummary } from "@/lib/family.functions";
import { useT } from "@/lib/i18n/provider";
import { getNannies } from "@/lib/nannies.functions";
import { staffNoun } from "@/lib/staff-roles";
import { getWalletSummary } from "@/lib/wallet.functions";

export const Route = createFileRoute("/wallet/$slug")({
  head: () => ({
    meta: [{ title: "Wallet: Family Wallet" }, { name: "robots", content: "noindex" }],
  }),
  component: WalletPage,
});

/** Which Wallet pages sit under which heading. Anything not listed falls under Records. */
const EMPLOYMENT = new Set(["agreement", "payroll", "bankdetails", "pettycash"]);

/** The top of the Wallet tab: the agreement, documents and records, with what needs attention marked on the row. */
function WalletPage() {
  const { slug } = Route.useParams();
  const t = useT();
  const summaryFn = useServerFn(getWalletSummary);
  const hubFn = useServerFn(getHubSummary);
  const nanniesFn = useServerFn(getNannies);
  const summary = useQuery({
    queryKey: ["wallet", slug],
    queryFn: () => summaryFn({ data: { slug } }),
  });
  const hubQuery = useQuery({
    queryKey: ["hub-summary", slug],
    queryFn: () => hubFn({ data: { slug } }),
  });
  const nanniesQuery = useQuery({
    queryKey: ["nannies", slug],
    queryFn: () => nanniesFn({ data: { slug } }),
  });

  if (summary.isLoading) return <PageLoading />;
  if (!summary.data?.unlocked) return <LockedNotice slug={slug} />;

  const wallet = summary.data.wallet;
  const isParent = wallet.access !== "nanny";
  const noun = staffNoun(wallet.nannies.map((n) => n.role));
  const section = navFor(isParent ? "family" : "nanny", wallet.agreementsEnabled, noun, t).find(
    (s) => s.label === "Wallet",
  );
  const items = (section?.items ?? []).filter((i) => routePrefix(i.to) !== "wallet");

  const attention = hubQuery.data?.attention;
  const staff = nanniesQuery.data?.nannies ?? [];
  const toSign =
    isParent && wallet.agreementsEnabled ? staff.filter((n) => !n.agreementSigned).length : 0;

  // What to say on a row, and whether it needs a look.
  const noteFor = (prefix: string): { detail: string; attention: boolean } | null => {
    if (prefix === "documents" && attention?.documentsExpired)
      return {
        detail: t("wallet.docsExpired", { count: attention.documentsExpired }),
        attention: true,
      };
    if (prefix === "documents" && attention?.documentsExpiring)
      return {
        detail: t("wallet.docsExpiring", { count: attention.documentsExpiring }),
        attention: true,
      };
    if (prefix === "agreement" && toSign > 0)
      return { detail: t("wallet.agreementsToSign", { count: toSign }), attention: true };
    if (prefix === "agreement" && isParent && staff.length > 0)
      return { detail: t("wallet.allSigned"), attention: false };
    return null;
  };

  const needsAttention = items.some((i) => noteFor(routePrefix(i.to))?.attention);
  const rows = (group: typeof items) => (
    <div className="ios-group">
      {group.map((item) => {
        const note = noteFor(routePrefix(item.to));
        return (
          <ActionRow
            key={item.to}
            slug={slug}
            to={item.to}
            icon={item.icon}
            title={item.title ?? item.label}
            detail={note?.detail}
            tone={note?.attention ? "attention" : "default"}
          />
        );
      })}
    </div>
  );
  const employment = items.filter((i) => EMPLOYMENT.has(routePrefix(i.to)));
  const records = items.filter((i) => !EMPLOYMENT.has(routePrefix(i.to)));

  return (
    <HubPage
      slug={slug}
      title={t("wallet.title")}
      intro={t(isParent ? "wallet.introParent" : "wallet.introStaff")}
    >
      {!needsAttention && hubQuery.data && (
        <p className="mb-6 text-sm text-muted-foreground">{t("wallet.allGood")}</p>
      )}
      <div className="space-y-8">
        {employment.length > 0 && (
          <section>
            <SectionTitle>{t("wallet.employment")}</SectionTitle>
            {rows(employment)}
          </section>
        )}
        {records.length > 0 && (
          <section>
            <SectionTitle>{t("wallet.records")}</SectionTitle>
            {rows(records)}
          </section>
        )}
      </div>
    </HubPage>
  );
}
