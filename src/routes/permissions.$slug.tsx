import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, HelpCircle, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import {
  getPermissions,
  removePermissionFn,
  setPermissionFn,
} from "@/lib/permissions.functions";
import {
  PERMISSION_ANSWERS,
  PERMISSION_CATEGORIES,
  PRESET_PERMISSIONS,
  type PermissionAnswer,
} from "@/lib/permissions.types";

export const Route = createFileRoute("/permissions/$slug")({
  head: () => ({
    meta: [
      { title: "Permissions & consents | Family Wallet" },
      {
        name: "description",
        content:
          "What your nanny can do without asking, what needs a message first, and who may collect the children.",
      },
      { property: "og:title", content: "Permissions & consents" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PermissionsPage,
});

const ANSWER_STYLE: Record<PermissionAnswer, string> = {
  yes: "text-primary",
  ask_first: "text-foreground",
  no: "text-destructive",
};

function AnswerIcon({ answer }: { answer: PermissionAnswer }) {
  if (answer === "yes") return <Check className="h-4 w-4" aria-hidden />;
  if (answer === "no") return <X className="h-4 w-4" aria-hidden />;
  return <HelpCircle className="h-4 w-4" aria-hidden />;
}

function PermissionsPage() {
  const { slug } = Route.useParams();
  const loadFn = useServerFn(getPermissions);
  const setFn = useServerFn(setPermissionFn);
  const removeFn = useServerFn(removePermissionFn);

  const query = useQuery({
    queryKey: ["permissions", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });
  const data = query.data;

  const [collectorName, setCollectorName] = useState("");
  const [collectorNote, setCollectorNote] = useState("");

  if (query.isLoading) return null;
  if (!data) return <LockedNotice slug={slug} />;

  const isParent = data.access === "family";
  const byKey = new Map(data.permissions.map((p) => [p.key, p]));
  const collectors = data.permissions.filter((p) => p.category === "collection");
  const answered = PRESET_PERMISSIONS.filter((p) => byKey.has(p.key)).length;

  const save = async (input: Parameters<typeof setFn>[0]["data"]["permission"], done?: string) => {
    try {
      await setFn({ data: { slug, permission: input } });
      await query.refetch();
      if (done) toast.success(done);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  };

  const addCollector = async () => {
    const name = collectorName.trim();
    if (!name) {
      toast.error("Please add the person's name.");
      return;
    }
    await save(
      {
        key: `collector:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Date.now().toString(36)}`,
        label: `Authorised to collect: ${name}`,
        category: "collection",
        answer: "yes",
        note: collectorNote,
        isCustom: true,
      },
      "Added",
    );
    setCollectorName("");
    setCollectorNote("");
  };

  return (
    <HubPage
      slug={slug}
      title="Permissions & consents"
      intro={
        isParent
          ? `Tell ${data.nannyName || "your nanny"} what is fine without asking, what needs a message first, and who may collect the children.`
          : "What the parents are happy for you to do, what needs a message first, and who may collect the children."
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        {answered} of {PRESET_PERMISSIONS.length} answered
        {isParent && answered < PRESET_PERMISSIONS.length ? ". Unanswered ones show as Not set." : "."}
      </p>

      {PERMISSION_CATEGORIES.filter((c) => c.value !== "collection" && c.value !== "other").map(
        (cat) => {
          const items = PRESET_PERMISSIONS.filter((p) => p.category === cat.value);
          if (items.length === 0) return null;
          return (
            <section key={cat.value} className="mb-8">
              <h2 className="heading-display text-lg text-foreground">{cat.label}</h2>
              <div className="mt-3 space-y-3">
                {items.map((p) => {
                  const current = byKey.get(p.key);
                  return (
                    <Card key={p.key}>
                      <p className="font-medium text-foreground">{p.label}</p>
                      {isParent ? (
                        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={p.label}>
                          {PERMISSION_ANSWERS.map((a) => (
                            <Button
                              key={a.value}
                              size="sm"
                              variant={current?.answer === a.value ? "default" : "outline"}
                              aria-pressed={current?.answer === a.value}
                              onClick={() =>
                                save({
                                  key: p.key,
                                  label: p.label,
                                  category: p.category,
                                  answer: a.value,
                                  note: current?.note,
                                })
                              }
                            >
                              {a.label}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p
                          className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${
                            current ? ANSWER_STYLE[current.answer as PermissionAnswer] : "text-muted-foreground"
                          }`}
                        >
                          {current ? (
                            <>
                              <AnswerIcon answer={current.answer as PermissionAnswer} />
                              {PERMISSION_ANSWERS.find((a) => a.value === current.answer)?.label}
                            </>
                          ) : (
                            "Not set yet"
                          )}
                        </p>
                      )}
                      {isParent && current && (
                        <NoteField
                          key={`${p.key}:${current.updatedAt}`}
                          initial={current.note}
                          onSave={(note) =>
                            save({
                              key: p.key,
                              label: p.label,
                              category: p.category,
                              answer: current.answer as PermissionAnswer,
                              note,
                            })
                          }
                        />
                      )}
                      {!isParent && current?.note && (
                        <p className="mt-1 text-sm text-muted-foreground">{current.note}</p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        },
      )}

      <section className="mb-8">
        <h2 className="heading-display text-lg text-foreground">Who can collect the children</h2>
        <div className="mt-3 space-y-3">
          {collectors.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No one added yet. Add each person who may collect from school or clubs.
            </p>
          )}
          {collectors.map((c) => (
            <Card key={c.key}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    <ShieldCheck className="mr-1.5 inline h-4 w-4 text-primary" />
                    {c.label.replace(/^Authorised to collect: /, "")}
                  </p>
                  {c.note && <p className="mt-1 text-sm text-muted-foreground">{c.note}</p>}
                </div>
                {isParent && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${c.label}`}
                    onClick={async () => {
                      await removeFn({ data: { slug, key: c.key } });
                      await query.refetch();
                      toast.success("Removed");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {isParent && (
            <Card>
              <h3 className="font-medium text-foreground">Add someone</h3>
              <div className="mt-3 grid gap-3">
                <Field
                  label="Name"
                  value={collectorName}
                  placeholder="e.g. Granny Pat"
                  onChange={setCollectorName}
                />
                <Field
                  label="Anything to know"
                  value={collectorNote}
                  placeholder="Relationship, password, how to recognise them"
                  onChange={setCollectorNote}
                />
              </div>
              <Button className="mt-4" onClick={addCollector}>
                Add person
              </Button>
            </Card>
          )}
        </div>
      </section>

      <p className="text-sm text-muted-foreground">
        These are your household's wishes for your nanny. They do not replace the nanny agreement
        or what the law requires.
      </p>
    </HubPage>
  );
}

function NoteField({ initial, onSave }: { initial: string; onSave: (note: string) => void }) {
  const [note, setNote] = useState(initial);
  return (
    <div className="mt-3">
      <Field
        label="Note for your nanny (optional)"
        value={note}
        placeholder="Anything that goes with this answer"
        onChange={setNote}
      />
      {note !== initial && (
        <Button size="sm" variant="outline" className="mt-2" onClick={() => onSave(note)}>
          Save note
        </Button>
      )}
    </div>
  );
}
