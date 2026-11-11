import { requireTwoStepClient } from "@/lib/two-step";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Pencil, Printer } from "lucide-react";

import { getAgreementAdmin, saveAgreementAdmin, signAsAgency } from "@/lib/admin.functions";
import { defaultAgreementData, type AgreementData } from "@/lib/agreement.model";
import { AgreementBuilder } from "@/components/AgreementBuilder";
import { AgreementDocument } from "@/components/AgreementDocument";
import { Card } from "@/components/hub-ui";
import { SignatureList } from "@/components/SignBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/agreement/$id")({
  beforeLoad: () => requireTwoStepClient(),
  head: () => ({
    meta: [
      { title: "Nanny agreement builder — Family Wallet admin" },
      {
        name: "description",
        content: "Build, issue and countersign a family's full nanny employment contract.",
      },
      { property: "og:title", content: "Nanny agreement builder — Family Wallet admin" },
      { property: "og:description", content: "Build, issue and countersign a nanny contract." },
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

  const [data, setData] = useState<AgreementData>(defaultAgreementData);
  const [agencyName, setAgencyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (query.data) setData(query.data.data);
  }, [query.data]);

  if (query.isLoading || !query.data) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const record = query.data;

  async function save(publish: boolean) {
    setBusy(true);
    try {
      await saveFn({ data: { familyId: id, fields: data, publish } });
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
      <div className="mx-auto max-w-3xl px-5 py-8">
        <Link
          to="/admin/family/$id"
          params={{ id }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground no-print"
        >
          <ArrowLeft className="h-4 w-4" /> Back to family
        </Link>
        <h1 className="heading-display mt-4 text-3xl text-primary no-print">Nanny agreement</h1>
        <p className="mt-2 text-sm text-muted-foreground no-print">
          {record.family.familyName} · {record.status === "issued" ? "Issued" : "Draft"} · version{" "}
          {record.version}
        </p>

        <div className="mt-5 flex flex-wrap gap-3 no-print">
          <Button variant="outline" onClick={() => setPreview((p) => !p)}>
            {preview ? (
              <>
                <Pencil className="mr-2 h-4 w-4" /> Back to builder
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" /> Preview contract
              </>
            )}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => save(false)}>
            Save draft
          </Button>
          <Button disabled={busy} onClick={() => save(true)}>
            {record.status === "issued" ? "Publish update" : "Issue to wallet"}
          </Button>
          {preview && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print / save as PDF
            </Button>
          )}
        </div>

        <div className="mt-6 space-y-6">
          {preview ? (
            <div className="print-area">
              <AgreementDocument data={data} familyName={record.family.familyName} />
            </div>
          ) : (
            <AgreementBuilder data={data} onChange={setData} />
          )}

          <p className="text-xs text-muted-foreground no-print">
            Families only see the agreement once it's issued. Publishing an update to an issued
            agreement creates a new version for signing.
          </p>

          <Card>
            <h2 className="heading-display text-lg text-foreground">Signatures</h2>
            <div className="mt-3">
              <SignatureList signatures={record.signatures} />
            </div>
            <div className="mt-5 space-y-3 border-t border-border pt-5">
              <label className="block">
                <span className="text-sm font-medium text-foreground">
                  Sign on behalf of your agency
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
