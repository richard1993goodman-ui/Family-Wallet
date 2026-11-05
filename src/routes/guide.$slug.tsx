import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getFamilyProfile } from "@/lib/family.functions";
import { Card, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/guide/$slug")({
  head: () => ({
    meta: [
      { title: "Nanny Quick Guide — The Family Wallet" },
      {
        name: "description",
        content:
          "A one-page quick guide for your nanny: children, allergies, routines, school and key contacts.",
      },
      { property: "og:title", content: "Nanny Quick Guide — The Family Wallet" },
      {
        property: "og:description",
        content: "Everything the nanny needs in one scroll, drawn from your family profile.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuickGuidePage,
});

function Line({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="mt-2">
      <span className="text-sm font-medium text-foreground">{label}: </span>
      <span className="text-sm whitespace-pre-line text-muted-foreground">{value}</span>
    </div>
  );
}

function QuickGuidePage() {
  const { slug } = Route.useParams();
  const loadFn = useServerFn(getFamilyProfile);
  const query = useQuery({
    queryKey: ["family-profile", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });

  if (query.isLoading) {
    return (
      <PageLoading />
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  const { children, profile, contacts, familyName } = query.data;

  return (
    <HubPage
      slug={slug}
      title="Nanny quick guide"
      intro={`Everything you need to know about the ${familyName} household.`}
    >
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        Print this guide
      </Button>

      {children.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          No children have been added yet. Add them in Know my family.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {children.map((child) => (
          <Card key={child.id}>
            <p className="heading-display text-lg text-foreground">{child.name}</p>
            <Line label="School" value={[child.year_group, child.school].filter(Boolean).join(" · ")} />
            <Line label="School hours" value={child.school_hours} />
            <Line label="Allergies" value={child.allergies} />
            <Line label="Dietary" value={child.dietary} />
            <Line label="Medication" value={child.medication} />
            <Line label="Morning" value={child.morning_routine} />
            <Line label="Bedtime" value={child.bedtime_routine} />
            <Line label="Loves" value={child.interests} />
            <Line label="Dislikes" value={child.dislikes} />
            <Line label="What makes them tick" value={child.what_makes_them_tick} />
          </Card>
        ))}
      </div>

      {profile && (
        <Card>
          <p className="heading-display text-lg text-foreground">The household</p>
          <Line label="Home" value={profile.home_address} />
          <Line label="Other addresses" value={profile.important_addresses} />
          <Line label="House rules" value={profile.house_rules} />
          <Line label="Screen time" value={profile.screen_time_rules} />
          <Line label="Homework" value={profile.homework_expectations} />
          <Line label="GP" value={profile.gp_details} />
          <Line label="Medical notes" value={profile.medical_notes} />
          <Line label="In an emergency" value={profile.emergency_instructions} />
        </Card>
      )}

      {contacts.length > 0 && (
        <Card>
          <p className="heading-display text-lg text-foreground">Key contacts</p>
          {contacts.map((contact, i) => (
            <p key={i} className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{contact.name}</span>
              {contact.relationship ? ` (${contact.relationship})` : ""} —{" "}
              <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="text-primary">
                {contact.phone}
              </a>
            </p>
          ))}
        </Card>
      )}
    </HubPage>
  );
}
