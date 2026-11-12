import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, LogOut } from "lucide-react";

import { DeleteAccount } from "@/components/DeleteAccount";
import { ActionRow, SectionTitle } from "@/components/dashboard/tiles";
import { useLogout } from "@/components/HeaderMenus";
import { HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { LanguagePicker } from "@/components/LanguagePicker";
import { navFor, routePrefix } from "@/components/wallet-nav";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { staffNoun } from "@/lib/staff-roles";
import { getWalletSummary } from "@/lib/wallet.functions";
import { getHubSummary } from "@/lib/family.functions";
import { initials } from "@/lib/wallet-overview";

export const Route = createFileRoute("/more/$slug")({
  head: () => ({
    meta: [{ title: "More: Family Wallet" }, { name: "robots", content: "noindex" }],
  }),
  component: MorePage,
});

/** Account pages first, then every other page, then settings. Help sits at the bottom of the hierarchy. */
const ACCOUNT = new Set(["notifications", "billing", "mylogin"]);

function MorePage() {
  const { slug } = Route.useParams();
  const t = useT();
  const logout = useLogout(slug);
  const summaryFn = useServerFn(getWalletSummary);
  const summary = useQuery({
    queryKey: ["wallet", slug],
    queryFn: () => summaryFn({ data: { slug } }),
  });
  const hubFn = useServerFn(getHubSummary);
  const hub = useQuery({ queryKey: ["hub-summary", slug], queryFn: () => hubFn({ data: { slug } }) });

  if (summary.isLoading) return <PageLoading />;
  if (!summary.data?.unlocked) return <LockedNotice slug={slug} />;

  const wallet = summary.data.wallet;
  const isParent = wallet.access !== "nanny";
  const noun = staffNoun(wallet.nannies.map((n) => n.role));
  const sections = navFor(isParent ? "family" : "nanny", wallet.agreementsEnabled, noun, t);
  const more = sections.find((s) => s.label === "More")?.items ?? [];
  const account = more.filter((i) => ACCOUNT.has(routePrefix(i.to)));
  const help = more.find((i) => routePrefix(i.to) === "support");
  const others = sections.filter((s) => s.label !== "More");
  const me = wallet.nannies.find((n) => n.isYou);
  const displayName = isParent ? wallet.familyName : (me?.name ?? wallet.familyName);
  const planLine = wallet.agencyName
    ? t("shell.withAgency", { agency: wallet.agencyName })
    : hub.data?.hasSubscription
      ? t("more.familyPlan")
      : null;

  return (
    <HubPage slug={slug} title={t("more.title")} intro={t("more.intro")}>
      <div className="space-y-8">
        <section className="surface-card rise flex items-center gap-4 p-4">
          <span className="flex h-13 w-13 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--sky),var(--mint))] text-[1.125rem] font-bold text-navy">
            {initials(displayName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[1.0625rem] font-semibold text-foreground">{displayName}</span>
            <span className="block truncate text-[0.8125rem] text-muted-foreground">
              {t("more.household", { name: wallet.familyName })}
              {planLine ? ` · ${planLine}` : ""}
            </span>
          </span>
        </section>
        {account.length > 0 && (
          <section className="rise">
            <SectionTitle>{t("more.account")}</SectionTitle>
            <div className="ios-group">
              {account.map((item) => (
                <ActionRow
                  key={item.to}
                  slug={slug}
                  to={item.to}
                  icon={item.icon}
                  title={item.title ?? item.label}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle>{t("shell.allPages")}</SectionTitle>
          <Accordion type="multiple" className="rounded-xl bg-card px-4">
            {others.map((section) => (
              <AccordionItem
                key={section.label}
                value={section.label}
                className="border-b border-border last:border-b-0"
              >
                <AccordionTrigger className="py-3 text-[0.9375rem] font-medium hover:no-underline">
                  {section.title ?? section.label}
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <ul>
                    {section.items.map((item) => (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          params={{ slug }}
                          className="flex min-h-12 items-center gap-3 rounded-lg px-1 text-[0.9375rem] text-foreground active:bg-accent"
                        >
                          <item.icon className="h-[1.125rem] w-[1.125rem] flex-none text-muted-foreground" />
                          {item.title ?? item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section>
          <LanguagePicker />
        </section>

        <section className="space-y-3">
          <Button
            variant="outline"
            className="h-12 w-full justify-start gap-3 text-base"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {slug === "demo" ? t("shell.exitDemo") : t("shell.lockLogout")}
          </Button>
          {help && (
            <div className="ios-group">
              <ActionRow
                slug={slug}
                to={help.to}
                icon={LifeBuoy}
                title={help.title ?? help.label}
              />
            </div>
          )}
        </section>

        {isParent && <DeleteAccount slug={slug} />}
      </div>
    </HubPage>
  );
}
