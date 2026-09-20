import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addFamilyContactFn,
  deleteFamilyContactFn,
  getEmergencyCard,
  saveEmergencyProfileFn,
  saveNannyEmergencyFn,
  updateFamilyContactFn,
} from "@/lib/family.functions";
import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";

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
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getEmergencyCard);
  const saveProfile = useServerFn(saveEmergencyProfileFn);
  const addContact = useServerFn(addFamilyContactFn);
  const updateContact = useServerFn(updateFamilyContactFn);
  const deleteContact = useServerFn(deleteFamilyContactFn);
  const saveNannyContact = useServerFn(saveNannyEmergencyFn);
  const query = useQuery({
    queryKey: ["emergency", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });
  const [profile, setProfile] = useState({
    homeAddress: "",
    gpDetails: "",
    medicalNotes: "",
    emergencyInstructions: "",
  });
  const [contact, setContact] = useState({ id: "", name: "", relationship: "", phone: "" });
  const [nannyContact, setNannyContact] = useState({ name: "", relationship: "", phone: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    setProfile({
      homeAddress: data.profile?.home_address ?? "",
      gpDetails: data.profile?.gp_details ?? "",
      medicalNotes: data.profile?.medical_notes ?? "",
      emergencyInstructions: data.profile?.emergency_instructions ?? "",
    });
    setNannyContact({
      name: data.nannyEmergency?.name ?? "",
      relationship: data.nannyEmergency?.relationship ?? "",
      phone: data.nannyEmergency?.phone ?? "",
    });
  }, [query.data]);

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  const { children, contacts, nannyEmergency, access } = query.data;
  const allContacts = [
    ...contacts.map((c) => ({ ...c, label: "Family contact" })),
    ...(nannyEmergency ? [{ ...nannyEmergency, label: "Nanny's emergency contact" }] : []),
  ];

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["emergency", slug] }),
      queryClient.invalidateQueries({ queryKey: ["wallet", slug] }),
      queryClient.invalidateQueries({ queryKey: ["hub-summary", slug] }),
    ]);
  }

  async function save(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that");
    } finally {
      setBusy(false);
    }
  }

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

        {access === "family" && (
          <div className="space-y-4 border-t border-border pt-7">
            <div>
              <h2 className="heading-display text-xl text-foreground">Edit emergency card</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep the family information your nanny may need in an emergency up to date.
              </p>
            </div>

            <Card>
              <p className="heading-display text-lg text-foreground">Family details</p>
              <div className="mt-4 space-y-4">
                <Field label="Home address" textarea value={profile.homeAddress} onChange={(value) => setProfile({ ...profile, homeAddress: value })} />
                <Field label="Doctor / GP details" textarea value={profile.gpDetails} onChange={(value) => setProfile({ ...profile, gpDetails: value })} />
                <Field label="Medical notes" textarea value={profile.medicalNotes} onChange={(value) => setProfile({ ...profile, medicalNotes: value })} />
                <Field label="Emergency instructions" textarea value={profile.emergencyInstructions} onChange={(value) => setProfile({ ...profile, emergencyInstructions: value })} />
                <Button disabled={busy} onClick={() => save(() => saveProfile({ data: { slug, ...profile } }), "Family emergency details saved")}>Save family details</Button>
              </div>
            </Card>

            <Card>
              <p className="heading-display text-lg text-foreground">Family emergency contacts</p>
              <div className="mt-4 space-y-4">
                {contacts.map((item) => (
                  <div key={item.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Name" value={contact.id === item.id ? contact.name : item.name} onChange={(value) => setContact({ id: item.id, name: value, relationship: contact.id === item.id ? contact.relationship : item.relationship ?? "", phone: contact.id === item.id ? contact.phone : item.phone })} />
                      <Field label="Relationship" value={contact.id === item.id ? contact.relationship : item.relationship ?? ""} onChange={(value) => setContact({ id: item.id, name: contact.id === item.id ? contact.name : item.name, relationship: value, phone: contact.id === item.id ? contact.phone : item.phone })} />
                      <Field label="Phone" type="tel" value={contact.id === item.id ? contact.phone : item.phone} onChange={(value) => setContact({ id: item.id, name: contact.id === item.id ? contact.name : item.name, relationship: contact.id === item.id ? contact.relationship : item.relationship ?? "", phone: value })} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => {
                        const values = contact.id === item.id ? contact : { id: item.id, name: item.name, relationship: item.relationship ?? "", phone: item.phone };
                        void save(() => updateContact({ data: { slug, ...values } }), "Contact updated");
                      }}>Save contact</Button>
                      <Button size="icon" variant="ghost" aria-label={`Remove ${item.name}`} disabled={busy} onClick={() => save(() => deleteContact({ data: { slug, id: item.id } }), "Contact removed")}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                {contacts.length < 3 && (
                  <div className="border-t border-border pt-4 first:border-0 first:pt-0">
                    <p className="text-sm font-medium text-foreground">Add a family contact</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Field label="Name" value={contact.id ? "" : contact.name} onChange={(value) => setContact({ id: "", name: value, relationship: contact.id ? "" : contact.relationship, phone: contact.id ? "" : contact.phone })} />
                      <Field label="Relationship" value={contact.id ? "" : contact.relationship} onChange={(value) => setContact({ id: "", name: contact.id ? "" : contact.name, relationship: value, phone: contact.id ? "" : contact.phone })} />
                      <Field label="Phone" type="tel" value={contact.id ? "" : contact.phone} onChange={(value) => setContact({ id: "", name: contact.id ? "" : contact.name, relationship: contact.id ? "" : contact.relationship, phone: value })} />
                    </div>
                    <Button className="mt-3" size="sm" variant="outline" disabled={busy || contact.id !== "" || !contact.name.trim() || !contact.phone.trim()} onClick={() => save(async () => {
                      await addContact({ data: { slug, name: contact.name, relationship: contact.relationship, phone: contact.phone } });
                      setContact({ id: "", name: "", relationship: "", phone: "" });
                    }, "Family contact added")}><Plus className="mr-1.5 h-4 w-4" /> Add contact</Button>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <p className="heading-display text-lg text-foreground">Nanny's emergency contact</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Field label="Name" value={nannyContact.name} onChange={(value) => setNannyContact({ ...nannyContact, name: value })} />
                <Field label="Relationship" value={nannyContact.relationship} onChange={(value) => setNannyContact({ ...nannyContact, relationship: value })} />
                <Field label="Phone" type="tel" value={nannyContact.phone} onChange={(value) => setNannyContact({ ...nannyContact, phone: value })} />
              </div>
              <Button className="mt-4" disabled={busy} onClick={() => save(() => saveNannyContact({ data: { slug, ...nannyContact } }), "Nanny emergency contact saved")}>Save nanny contact</Button>
            </Card>
          </div>
        )}
      </div>
    </HubPage>
  );
}
