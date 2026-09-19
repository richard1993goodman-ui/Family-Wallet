import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Phone } from "lucide-react";

import { getEmergencyCard } from "@/lib/family.functions";
import { Card, HubPage, LockedNotice } from "@/components/hub-ui";

export const Route = createFileRoute("/emergency/$slug")({
  head: () => ({
    meta: [
      { title: "Emergency Card — Athlete Mannies & Nannies" },
      {
        name: "description",
        content:
          "One screen with your family's emergency contacts, allergies, medication, GP and home address.",
      },
      { property: "og:title", content: "Emergency Card — Athlete Mannies & Nannies" },
      {
        property: "og:description",
        content: "Key emergency information for your nanny, in one tap.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  const { slug } = Route.useParams();
  const loadFn = useServerFn(getEmergencyCard);
  const query = useQuery({
    queryKey: ["emergency", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  const { profile, children, contacts, nannyEmergency } = query.data;
  const allContacts = [
    ...contacts.map((c) => ({ ...c, label: "Family contact" })),
    ...(nannyEmergency ? [{ ...nannyEmergency, label: "Nanny's emergency contact" }] : []),
  ];

  return (
    <HubPage slug={slug} title="Emergency card" intro="Tap any number to call it straight away.">
      <div className="space-y-3">
        {allContacts.length === 0 && (
          <p className="text-sm text-muted-foreground">No emergency contacts added yet.</p>
        )}
        {allContacts.map((contact, i) => (
          <a
            key={i}
            href={`tel:${contact.phone.replace(/\s+/g, "")}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/40"
          >
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {contact.label}
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {contact.name}
                {contact.relationship ? ` · ${contact.relationship}` : ""}
              </span>
              <span className="text-sm text-muted-foreground">{contact.phone}</span>
            </span>
            <Phone className="h-5 w-5 flex-shrink-0 text-primary" />
          </a>
        ))}

        {children.some((c) => c.allergies || c.medication) && (
          <Card>
            <p className="heading-display text-lg text-foreground">Allergies &amp; medication</p>
            {children.map((child, i) => (
              <div key={i} className="mt-3">
                <p className="font-medium text-foreground">{child.name}</p>
                {child.allergies && (
                  <p className="text-sm text-destructive">Allergies: {child.allergies}</p>
                )}
                {child.medication && (
                  <p className="text-sm text-muted-foreground">Medication: {child.medication}</p>
                )}
                {child.school && (
                  <p className="text-sm text-muted-foreground">School: {child.school}</p>
                )}
              </div>
            ))}
          </Card>
        )}

        {profile && (profile.home_address || profile.gp_details || profile.emergency_instructions) && (
          <Card>
            <p className="heading-display text-lg text-foreground">Key details</p>
            {profile.home_address && (
              <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                <span className="font-medium text-foreground">Home: </span>
                {profile.home_address}
              </p>
            )}
            {profile.gp_details && (
              <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                <span className="font-medium text-foreground">GP: </span>
                {profile.gp_details}
              </p>
            )}
            {profile.medical_notes && (
              <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                <span className="font-medium text-foreground">Medical notes: </span>
                {profile.medical_notes}
              </p>
            )}
            {profile.emergency_instructions && (
              <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                <span className="font-medium text-foreground">In an emergency: </span>
                {profile.emergency_instructions}
              </p>
            )}
          </Card>
        )}

        <p className="pt-2 text-sm text-muted-foreground">
          In a life-threatening emergency always call 999 first.
        </p>
      </div>
    </HubPage>
  );
}
