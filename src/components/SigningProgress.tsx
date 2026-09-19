import { CheckCircle2, Circle } from "lucide-react";

import type { Signature } from "@/lib/agreement.types";
import { formatSignedAt } from "@/components/SignBlock";

export type SigningProgressProps = {
  status: "draft" | "issued";
  version: number;
  signatures: Signature[];
  compact?: boolean;
};

type Row = { role: "parent" | "nanny" | "agency"; label: string; signature?: Signature };

export function signingRows(
  signatures: Signature[],
  version: number,
): { rows: Row[]; complete: boolean } {
  const current = signatures.filter(
    (s) => s.docKind === "agreement" && s.docVersion === String(version),
  );
  const find = (role: Row["role"]) => current.find((s) => s.signerRole === role);
  const rows: Row[] = [
    { role: "parent", label: "Parent / employer", signature: find("parent") },
    { role: "nanny", label: "Nanny / manny", signature: find("nanny") },
    { role: "agency", label: "Athlete Mannies", signature: find("agency") },
  ];
  return { rows, complete: Boolean(find("parent") && find("nanny")) };
}

export function SigningProgress({ status, version, signatures, compact }: SigningProgressProps) {
  const { rows, complete } = signingRows(signatures, version);
  const required = rows.filter((r) => r.role !== "agency");
  const done = required.filter((r) => r.signature).length;

  const action =
    status !== "issued"
      ? "Not open for signing yet — finish the agreement and choose “Done — ready to sign”."
      : complete
        ? "Both signatures are in. Your signed copy stays in the wallet."
        : done === 0
          ? "Waiting on both signatures — parent and nanny."
          : `Waiting on the ${required.find((r) => !r.signature)?.label.toLowerCase()} signature.`;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="heading-display text-lg text-foreground">Signing progress</h2>
        <span className="text-sm text-muted-foreground">
          {done} of {required.length} signed
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.role} className="flex items-start gap-3">
            {row.signature ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground/50" />
            )}
            <span className="text-sm">
              <span className="block font-medium text-foreground">
                {row.label}
                {row.role === "agency" && !row.signature && (
                  <span className="font-normal text-muted-foreground"> — optional</span>
                )}
              </span>
              <span className="block text-muted-foreground">
                {row.signature
                  ? `${row.signature.signerName} · signed ${formatSignedAt(row.signature.signedAt)}`
                  : "Not signed yet"}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {!compact && (
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{action}</p>
      )}
    </div>
  );
}
