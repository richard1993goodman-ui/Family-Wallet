import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";

import {
  archiveNannyFn,
  getNannies,
  saveNannyFn,
  uploadNannyPhotoFn,
} from "@/lib/nannies.functions";
import { getNannyInvite } from "@/lib/agreement.functions";
import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/nannies/$slug")({
  head: () => ({
    meta: [
      { title: "Your nannies — The Family Wallet" },
      {
        name: "description",
        content:
          "Add everyone who works with your family, share their sign-in code and keep each nanny agreement in one place.",
      },
      { property: "og:title", content: "Your nannies — The Family Wallet" },
      {
        property: "og:description",
        content: "Manage every nanny in your Family Wallet — codes, details and agreements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NanniesPage,
});

const emptyForm = {
  id: "",
  name: "",
  bio: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
};

function NanniesPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getNannies);
  const saveFn = useServerFn(saveNannyFn);
  const archiveFn = useServerFn(archiveNannyFn);
  const photoFn = useServerFn(uploadNannyPhotoFn);
  const inviteFn = useServerFn(getNannyInvite);

  const query = useQuery({ queryKey: ["nannies", slug], queryFn: () => loadFn({ data: { slug } }) });
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<Record<string, string>>({});

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  const nannies = query.data.nannies;

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["nannies", slug] }),
      queryClient.invalidateQueries({ queryKey: ["wallet", slug] }),
      queryClient.invalidateQueries({ queryKey: ["hub-summary", slug] }),
    ]);
  }

  async function run(action: () => Promise<unknown>, message: string) {
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

  async function showCode(nannyId: string, regenerate: boolean) {
    setBusy(true);
    try {
      const result = await inviteFn({ data: { slug, nannyId, regenerate } });
      if (!result) {
        toast.error("Please unlock your wallet again.");
        return;
      }
      setCodes((current) => ({ ...current, [nannyId]: result.code }));
      if (regenerate) toast.success("New code created. The old one no longer works.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(nannyId: string, file: File) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("Couldn't read that file"));
      reader.readAsDataURL(file);
    });
    await run(
      () => photoFn({ data: { slug, nannyId, fileName: file.name, contentType: file.type, base64 } }),
      "Photo saved",
    );
  }

  const inviteLink =
    typeof window !== "undefined" ? `${window.location.origin}/nanny/${slug}` : `/nanny/${slug}`;

  return (
    <HubPage
      slug={slug}
      title="Your nannies"
      intro="Add everyone who works with your family. Each one gets their own sign-in code and their own agreement."
    >
      <div className="space-y-4">
        {nannies.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No one added yet. Add your first nanny below.
          </p>
        )}

        {nannies.map((nanny) => {
          const editing = form.id === nanny.id;
          const code = codes[nanny.id] ?? nanny.code ?? null;
          return (
            <Card key={nanny.id}>
              <div className="flex items-start gap-4">
                {nanny.photoUrl && (
                  <img
                    src={nanny.photoUrl}
                    alt={nanny.name}
                    className="h-16 w-16 flex-shrink-0 rounded-full border border-border object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="heading-display text-xl text-foreground">{nanny.name}</p>
                  {nanny.bio && <p className="mt-1 text-sm text-muted-foreground">{nanny.bio}</p>}
                  <p className="mt-2 text-sm text-muted-foreground">
                    Agreement:{" "}
                    {nanny.agreementSigned
                      ? "signed by both of you"
                      : nanny.agreementStatus === "none"
                        ? "not started"
                        : nanny.agreementStatus === "draft"
                          ? "draft saved"
                          : "waiting for signatures"}
                  </p>
                  {nanny.emergencyName && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Emergency contact: {nanny.emergencyName}
                      {nanny.emergencyRelationship ? ` · ${nanny.emergencyRelationship}` : ""}
                      {nanny.emergencyPhone ? ` · ${nanny.emergencyPhone}` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/agreement/$slug" params={{ slug }} search={{ nanny: nanny.id }}>
                    Open agreement
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => showCode(nanny.id, false)}
                >
                  {code ? "Show sign-in code" : "Create sign-in code"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setForm(
                      editing
                        ? emptyForm
                        : {
                            id: nanny.id,
                            name: nanny.name,
                            bio: nanny.bio ?? "",
                            emergencyName: nanny.emergencyName ?? "",
                            emergencyRelationship: nanny.emergencyRelationship ?? "",
                            emergencyPhone: nanny.emergencyPhone ?? "",
                          },
                    )
                  }
                >
                  {editing ? "Close" : "Edit details"}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${nanny.name}`}
                  disabled={busy}
                  onClick={() =>
                    run(() => archiveFn({ data: { slug, id: nanny.id } }), `${nanny.name} removed`)
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {code && (
                <div className="mt-4 space-y-2 rounded-lg bg-muted p-3">
                  <p className="break-all text-sm">{inviteLink}</p>
                  <p className="font-mono text-lg tracking-[0.3em]">{code}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `Your nanny agreement is ready: ${inviteLink}\nYour code: ${code}`,
                        );
                        toast.success("Invitation copied — paste it into a message or email.");
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Copy invitation
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => showCode(nanny.id, true)}
                    >
                      New code
                    </Button>
                  </div>
                </div>
              )}

              {editing && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  <Field
                    label="Name"
                    value={form.name}
                    onChange={(value) => setForm({ ...form, name: value })}
                  />
                  <Field
                    label="About them"
                    textarea
                    value={form.bio}
                    onChange={(value) => setForm({ ...form, bio: value })}
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field
                      label="Emergency contact name"
                      value={form.emergencyName}
                      onChange={(value) => setForm({ ...form, emergencyName: value })}
                    />
                    <Field
                      label="Relationship"
                      value={form.emergencyRelationship}
                      onChange={(value) => setForm({ ...form, emergencyRelationship: value })}
                    />
                    <Field
                      label="Phone"
                      type="tel"
                      value={form.emergencyPhone}
                      onChange={(value) => setForm({ ...form, emergencyPhone: value })}
                    />
                  </div>
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-1.5 block w-full text-sm text-muted-foreground"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadPhoto(nanny.id, file);
                      }}
                    />
                  </label>
                  <Button
                    disabled={busy || !form.name.trim()}
                    onClick={() =>
                      run(async () => {
                        await saveFn({ data: { slug, nanny: form } });
                        setForm(emptyForm);
                      }, "Details saved")
                    }
                  >
                    Save details
                  </Button>
                </div>
              )}
            </Card>
          );
        })}

        <Card>
          {adding ? (
            <div className="space-y-4">
              <p className="heading-display text-lg text-foreground">Add a nanny</p>
              <Field
                label="Name"
                value={form.id ? "" : form.name}
                onChange={(value) => setForm({ ...emptyForm, name: value })}
              />
              <Field
                label="About them"
                textarea
                value={form.id ? "" : form.bio}
                onChange={(value) => setForm({ ...emptyForm, name: form.name, bio: value })}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy || Boolean(form.id) || !form.name.trim()}
                  onClick={() =>
                    run(async () => {
                      await saveFn({
                        data: { slug, nanny: { name: form.name, bio: form.bio } },
                      });
                      setForm(emptyForm);
                      setAdding(false);
                    }, "Nanny added")
                  }
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add nanny
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setForm(emptyForm);
                    setAdding(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setForm(emptyForm);
                setAdding(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add another nanny
            </Button>
          )}
        </Card>
      </div>
    </HubPage>
  );
}
