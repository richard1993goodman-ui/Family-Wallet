import { Card } from "@/components/hub-ui";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import type { AgreementHistoryEntry } from "@/lib/agreement.server";

/** Every issued version of the agreement and who signed it. Older versions are kept exactly as they were issued. */
export function AgreementHistory({ history }: { history: AgreementHistoryEntry[] }) {
  const t = useT();
  if (history.length === 0) return null;
  return (
    <Card className="print:hidden">
      <h2 className="heading-display text-lg text-foreground">{t("agr.historyTitle")}</h2>
      <ul className="mt-3 space-y-4">
        {history.map((entry) => (
          <li key={entry.version} className="text-sm">
            <p className="font-medium text-foreground">
              {t("agr.historyIssued", { version: entry.version, date: formatDate(entry.issuedAt) })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("agr.historyFingerprint", { code: entry.fingerprint })}
            </p>
            {entry.signedCopy && <p className="text-xs text-muted-foreground">{t("agr.historySignedCopy")}</p>}
            {entry.signatures.length === 0 ? (
              <p className="mt-1 text-muted-foreground">{t("agr.historyNoSignatures")}</p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {entry.signatures.map((s, i) => (
                  <li key={i}>
                    {t("agr.historySigned", { name: s.name, role: s.role, date: formatDate(s.at) })}{s.verified ? ` · ${t("agr.historyVerified")}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
