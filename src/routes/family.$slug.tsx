import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen } from "lucide-react";

import {
  deleteChildFn,
  getFamilyProfile,
  saveChildFn,
  saveProfileFn,
  uploadChildPhotoFn,
} from "@/lib/family.functions";
import type { ChildInput, ProfileInput } from "@/lib/family.types";
import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/family/$slug")({
  head: () => ({
    meta: [
      { title: "Know My Family — Athlete Mannies & Nannies" },
      {
        name: "description",
        content:
          "Your family profile: children, routines, allergies, school details and house rules, shared with your nanny.",
      },
      { property: "og:title", content: "Know My Family — Athlete Mannies & Nannies" },
      {
        property: "og:description",
        content: "Everything your nanny needs to know about your family, in one place.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FamilyProfilePage,
});

const emptyChild: ChildInput = { name: "" };

function FamilyProfilePage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getFamilyProfile);
  const saveProfile = useServerFn(saveProfileFn);
  const saveChild = useServerFn(saveChildFn);
  const removeChild = useServerFn(deleteChildFn);
  const uploadPhoto = useServerFn(uploadChildPhotoFn);

  const query = useQuery({
    queryKey: ["family-profile", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });

  const [profile, setProfile] = useState<ProfileInput>({});
  const [editing, setEditing] = useState<ChildInput | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = query.data?.profile;
    if (p) {
      setProfile({
        homeAddress: p.home_address ?? "",
        importantAddresses: p.important_addresses ?? "",
        houseRules: p.house_rules ?? "",
        screenTimeRules: p.screen_time_rules ?? "",
        homeworkExpectations: p.homework_expectations ?? "",
        gpDetails: p.gp_details ?? "",
        medicalNotes: p.medical_notes ?? "",
        emergencyInstructions: p.emergency_instructions ?? "",
      });
    }
  }, [query.data?.profile]);

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  const children = query.data.children;

  async function onSaveProfile() {
    setBusy(true);
    try {
      await saveProfile({ data: { slug, profile } });
      toast.success("Saved");
      await queryClient.invalidateQueries({ queryKey: ["family-profile", slug] });
    } catch {
      toast.error("Couldn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveChild() {
    if (!editing) return;
    setBusy(true);
    try {
      await saveChild({ data: { slug, child: editing } });
      toast.success("Saved");
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["family-profile", slug] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(childId: string, file: File) {
    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    await uploadPhoto({
      data: { slug, childId, fileName: file.name, contentType: file.type, base64 },
    });
    toast.success("Photo added");
    await queryClient.invalidateQueries({ queryKey: ["family-profile", slug] });
  }

  return (
    <HubPage
      slug={slug}
      title="Know my family"
      intro="Fill this in once. Your nanny gets a simple quick guide from everything you add here."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/guide/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40"
        >
          <BookOpen className="h-4 w-4 text-primary" /> Open the nanny quick guide
        </Link>
      </div>

      <h2 className="heading-display mt-8 text-lg text-foreground">Your children</h2>
      <div className="mt-3 space-y-3">
        {children.map((child) => (
          <Card key={child.id}>
            <div className="flex items-start gap-4">
              {child.photoUrl ? (
                <img
                  src={child.photoUrl}
                  alt={child.name}
                  className="h-16 w-16 flex-shrink-0 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-accent text-lg font-semibold text-foreground">
                  {child.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="heading-display text-lg text-foreground">{child.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[child.year_group, child.school].filter(Boolean).join(" · ") || "No school added"}
                </p>
                {child.allergies && (
                  <p className="mt-1 text-sm font-medium text-destructive">
                    Allergies: {child.allergies}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <button
                    className="font-medium text-primary hover:underline"
                    onClick={() =>
                      setEditing({
                        id: child.id,
                        name: child.name,
                        dateOfBirth: child.date_of_birth ?? "",
                        school: child.school ?? "",
                        yearGroup: child.year_group ?? "",
                        schoolHours: child.school_hours ?? "",
                        allergies: child.allergies ?? "",
                        dietary: child.dietary ?? "",
                        medication: child.medication ?? "",
                        personality: child.personality ?? "",
                        interests: child.interests ?? "",
                        dislikes: child.dislikes ?? "",
                        morningRoutine: child.morning_routine ?? "",
                        bedtimeRoutine: child.bedtime_routine ?? "",
                        whatMakesThemTick: child.what_makes_them_tick ?? "",
                      })
                    }
                  >
                    Edit
                  </button>
                  <label className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Add photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onPhoto(child.id, file);
                      }}
                    />
                  </label>
                  <button
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      await removeChild({ data: { slug, id: child.id } });
                      await queryClient.invalidateQueries({ queryKey: ["family-profile", slug] });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {editing ? (
          <Card>
            <p className="heading-display text-lg text-foreground">
              {editing.id ? "Edit child" : "Add a child"}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Name"
                value={editing.name}
                onChange={(v) => setEditing({ ...editing, name: v })}
              />
              <Field
                label="Date of birth"
                type="date"
                value={editing.dateOfBirth ?? ""}
                onChange={(v) => setEditing({ ...editing, dateOfBirth: v })}
              />
              <Field
                label="School"
                value={editing.school ?? ""}
                onChange={(v) => setEditing({ ...editing, school: v })}
              />
              <Field
                label="Year group"
                value={editing.yearGroup ?? ""}
                onChange={(v) => setEditing({ ...editing, yearGroup: v })}
              />
              <Field
                label="School hours"
                placeholder="8:45am – 3:30pm"
                value={editing.schoolHours ?? ""}
                onChange={(v) => setEditing({ ...editing, schoolHours: v })}
              />
              <Field
                label="Allergies"
                value={editing.allergies ?? ""}
                onChange={(v) => setEditing({ ...editing, allergies: v })}
              />
              <Field
                label="Dietary needs"
                value={editing.dietary ?? ""}
                onChange={(v) => setEditing({ ...editing, dietary: v })}
              />
              <Field
                label="Medication"
                value={editing.medication ?? ""}
                onChange={(v) => setEditing({ ...editing, medication: v })}
              />
            </div>
            <div className="mt-4 space-y-4">
              <Field
                label="Personality"
                textarea
                value={editing.personality ?? ""}
                onChange={(v) => setEditing({ ...editing, personality: v })}
              />
              <Field
                label="Interests and favourite activities"
                textarea
                value={editing.interests ?? ""}
                onChange={(v) => setEditing({ ...editing, interests: v })}
              />
              <Field
                label="Things they dislike"
                textarea
                value={editing.dislikes ?? ""}
                onChange={(v) => setEditing({ ...editing, dislikes: v })}
              />
              <Field
                label="Morning routine"
                textarea
                value={editing.morningRoutine ?? ""}
                onChange={(v) => setEditing({ ...editing, morningRoutine: v })}
              />
              <Field
                label="Bedtime routine"
                textarea
                value={editing.bedtimeRoutine ?? ""}
                onChange={(v) => setEditing({ ...editing, bedtimeRoutine: v })}
              />
              <Field
                label="What makes them tick"
                textarea
                value={editing.whatMakesThemTick ?? ""}
                onChange={(v) => setEditing({ ...editing, whatMakesThemTick: v })}
              />
            </div>
            <div className="mt-5 flex gap-3">
              <Button onClick={onSaveChild} disabled={busy}>
                Save child
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        ) : (
          <Button variant="outline" onClick={() => setEditing({ ...emptyChild })}>
            <Plus className="mr-1.5 h-4 w-4" /> Add a child
          </Button>
        )}
      </div>

      <h2 className="heading-display mt-9 text-lg text-foreground">Household</h2>
      <Card>
        <div className="space-y-4">
          <Field
            label="Home address"
            textarea
            value={profile.homeAddress ?? ""}
            onChange={(v) => setProfile({ ...profile, homeAddress: v })}
          />
          <Field
            label="Other important addresses"
            textarea
            placeholder="Grandparents, clubs, after-school care…"
            value={profile.importantAddresses ?? ""}
            onChange={(v) => setProfile({ ...profile, importantAddresses: v })}
          />
          <Field
            label="House rules"
            textarea
            value={profile.houseRules ?? ""}
            onChange={(v) => setProfile({ ...profile, houseRules: v })}
          />
          <Field
            label="Screen-time rules"
            textarea
            value={profile.screenTimeRules ?? ""}
            onChange={(v) => setProfile({ ...profile, screenTimeRules: v })}
          />
          <Field
            label="Homework expectations"
            textarea
            value={profile.homeworkExpectations ?? ""}
            onChange={(v) => setProfile({ ...profile, homeworkExpectations: v })}
          />
          <Field
            label="Doctor / GP details"
            textarea
            value={profile.gpDetails ?? ""}
            onChange={(v) => setProfile({ ...profile, gpDetails: v })}
          />
          <Field
            label="Medical notes"
            textarea
            value={profile.medicalNotes ?? ""}
            onChange={(v) => setProfile({ ...profile, medicalNotes: v })}
          />
          <Field
            label="Emergency instructions"
            textarea
            placeholder="What should your nanny do in an emergency?"
            value={profile.emergencyInstructions ?? ""}
            onChange={(v) => setProfile({ ...profile, emergencyInstructions: v })}
          />
          <Button onClick={onSaveProfile} disabled={busy}>
            {busy ? "Saving…" : "Save household details"}
          </Button>
        </div>
      </Card>
    </HubPage>
  );
}
