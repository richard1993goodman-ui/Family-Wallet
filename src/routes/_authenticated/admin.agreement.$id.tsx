import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { getAgreementAdmin, saveAgreementAdmin, signAsAgency } from "@/lib/admin.functions";
import { AGREEMENT_SECTIONS, EMPTY_AGREEMENT } from "@/lib/agreement.types";
import type { AgreementFields } from "@/lib/agreement.types";
import { Card, Field } from "@/components/hub-ui";
import { SignatureList } from "@/components/SignBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/agreement/$id")({
  head: () => ({
    meta: [
      { title: "Edit nanny agreement — Athlete Mannies admin" },
      { name: "description", content: "Write, issue and countersign a family's nanny agreement." },
      { property: "og:title", content: "Edit nanny agreement — Athlete Mannies admin" },
      { property: "og:description", content: "Write, issue and countersign a nanny agreement." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAgreementPage,
});

function AdminAgreementPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getAgreementAdmin);
  const saveFn = useServerFn(saveAgreementAdmin);
  const signFn = useServerFn(signAsAgency);

  const query = useQuery({
    queryKey: ["admin-agreement", id],
    queryFn: () => loadFn({ data: { familyId: id } }),
  });

  const [fields, setFields] = useState<AgreementFields>(EMPTY_AGREEMENT);
  const [agencyName, setAgencyName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.data) setFields(query.data.fields);
  }, [query.data]);

  if (query.isLoading || !query.data) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const data = query.data;

  async function save(publish: boolean) {
    setBusy(true);
    try {
      await saveFn({ data: { familyId: id, fields, publish } });
      toast.success(publish ? "Agreement issued to the wallet" : "Draft saved");
      await queryClient.invalidateQueries({ queryKey: ["admin-agreement", id] });
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function countersign(docKind: "agreement" | "terms") {
    if (agencyName.trim().length < 3) {
      toast.error("Type your full name first.");
      return;
    }
    await signFn({ data: { familyId: id, docKind, name: agencyName } });
    setAgencyName("");
    toast.success("Signature recorded");
    await queryClient.invalidateQueries({ queryKey: ["admin-agreement", id] });
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Link
          to="/admin/family/$id"
          params={{ id }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to family
        </Link>
        <h1 className="heading-display mt-4 text-3xl text-primary">Nanny agreement</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.family.familyName} · {data.status === "issued" ? "Issued" : "Draft"} · version{" "}
          {data.version}
        </p>

        <div className="mt-6 space-y-6">
          <Card>
            <div className="space-y-4">
              {AGREEMENT_SECTIONS.map((section) => (
                <Field
                  key={section.key}
                  label={section.label}
                  value={fields[section.key] ?? ""}
                  placeholder={section.placeholder}
                  textarea={section.textarea}
                  onChange={(value) => setFields((f) => ({ ...f, [section.key]: value }))}
                />
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="outline" disabled={busy} onClick={() => save(false)}>
                Save draft
              </Button>
              <Button disabled={busy} onClick={() => save(true)}>
                {data.status === "issued" ? "Publish update" : "Issue to wallet"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Families only see the agreement once it's issued. Publishing an update to an issued
              agreement creates a new version for signing.
            </p>
          </Card>

          <Card>
            <h2 className="heading-display text-lg text-foreground">Signatures</h2>
            <div className="mt-3">
              <SignatureList signatures={data.signatures} />
            </div>
            <div className="mt-5 space-y-3 border-t border-border pt-5">
              <label className="block">
                <span className="text-sm font-medium text-foreground">
                  Sign on behalf of Athlete Mannies
                </span>
                <Input
                  className="mt-1.5"
                  value={agencyName}
                  placeholder="Your full name"
                  onChange={(e) => setAgencyName(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => countersign("agreement")}>
                  Countersign agreement
                </Button>
                <Button variant="outline" onClick={() => countersign("terms")}>
                  Countersign terms
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
