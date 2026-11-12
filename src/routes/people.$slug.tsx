import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Baby, Siren, UserRound } from "lucide-react";

import { ActionRow, SectionTitle } from "@/components/dashboard/tiles";
import { HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { getEmergencyCard } from "@/lib/family.functions";
import { useT } from "@/lib/i18n/provider";

export const Route = createFileRoute("/people/$slug")({
  head: () => ({
    meta: [{ title: "People: Family Wallet" }, { name: "robots", content: "noindex" }],
  }),
  component: PeoplePage,
});

/** The top of the People tab: the children and the staff in one place, with the emergency card one tap away. */
function PeoplePage() {
  const { slug } = Route.useParams();
  const t = useT();
  const load = useServerFn(getEmergencyCard);
  const query = useQuery({
    queryKey: ["people-overview", slug],
    queryFn: () => load({ data: { slug } }),
  });

  if (query.isLoading) return <PageLoading />;
  const data = query.data;
  if (!data) return <LockedNotice slug={slug} />;

  const isParent = data.access === "family";
  // Parents edit children on "Children & routines"; staff read about them in the playbook.
  const childrenTo = isParent ? ("/family/$slug" as const) : ("/kids/$slug" as const);

  return (
    <HubPage
      slug={slug}
      title={t("people.title")}
      intro={t(isParent ? "people.introParent" : "people.introStaff")}
    >
      <div className="space-y-8">
        <section className="rise">
          <SectionTitle>{t("people.children")}</SectionTitle>
          <div className="ios-group">
            {data.children.map((child, i) => (
              <ActionRow
                key={`${child.name}-${i}`}
                slug={slug}
                to={childrenTo}
                icon={Baby}
                title={child.name}
                detail={child.school ?? undefined}
              />
            ))}
            {data.children.length === 0 && isParent && (
              <ActionRow
                slug={slug}
                to="/family/$slug"
                icon={Baby}
                title={t("people.addChildren")}
                tone="attention"
              />
            )}
          </div>
          {data.children.length === 0 && !isParent && (
            <p className="text-sm text-muted-foreground">{t("people.noChildrenStaff")}</p>
          )}
        </section>

        {isParent && (
          <section>
            <SectionTitle>{t("people.staff")}</SectionTitle>
            <div className="ios-group">
              {data.nannies.map((nanny) => (
                <ActionRow
                  key={nanny.id}
                  slug={slug}
                  to="/nannies/$slug"
                  icon={UserRound}
                  title={nanny.name}
                />
              ))}
              <ActionRow
                slug={slug}
                to="/nannies/$slug"
                icon={UserRound}
                title={data.nannies.length ? t("people.manageStaff") : t("people.addStaff")}
                tone={data.nannies.length ? "default" : "attention"}
              />
            </div>
          </section>
        )}

        <section>
          <div className="ios-group">
            <ActionRow
              slug={slug}
              to="/emergency/$slug"
              icon={Siren}
              title={t("dash.emergencyCard")}
              detail={t("dash.contactsAllergiesMedicationGpAnd")}
            />
          </div>
        </section>
      </div>
    </HubPage>
  );
}
