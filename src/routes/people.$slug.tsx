import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Baby, Siren, UserRound } from "lucide-react";

import { ActionRow, SectionTitle } from "@/components/dashboard/tiles";
import { allergyNote, initials } from "@/lib/wallet-overview";
import { cn } from "@/lib/utils";
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
          {data.children.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {data.children.map((child, i) => {
                const note = allergyNote(child.allergies);
                return (
                  <Link
                    key={`${child.name}-${i}`}
                    to={childrenTo}
                    params={{ slug }}
                    className="surface-card flex flex-col gap-3 p-4 transition-transform duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--sky),var(--mint))] text-[0.9375rem] font-bold text-navy">
                      {initials(child.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">{child.name}</span>
                      {child.school && <span className="block truncate text-[0.8125rem] text-muted-foreground">{child.school}</span>}
                    </span>
                    {note && (
                      <span
                        className={cn(
                          "line-clamp-2 self-start rounded-full px-2.5 py-1 text-[0.75rem] font-semibold",
                          note.kind === "warn" ? "bg-tint-apricot text-tint-apricot-ink" : "bg-mint text-brand",
                        )}
                      >
                        {note.kind === "warn" ? t("people.allergies", { list: note.text }) : t("people.noAllergies")}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
          <div className="ios-group">
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
