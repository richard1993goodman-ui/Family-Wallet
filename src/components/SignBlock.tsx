import { useState } from "react";
import { BadgeCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Signature } from "@/lib/agreement.types";
import { useT } from "@/lib/i18n/provider";

const ROLE_LABELS: Record<Signature["signerRole"], string> = {
  parent: "Parent / employer",
  nanny: "Nanny / manny",
  agency: "Agency",
};

export function formatSignedAt(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SignatureList({ signatures }: { signatures: Signature[] }) {
  if (signatures.length === 0) {
    return <p className="text-sm text-muted-foreground">No signatures recorded yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {signatures.map((s, i) => (
        <li key={i} className="flex items-start gap-3">
          <BadgeCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <span className="text-sm">
            <span className="block font-medium text-foreground">
              {s.signerName}{" "}
              <span className="font-normal text-muted-foreground">
                — {ROLE_LABELS[s.signerRole]}
              </span>
            </span>
            <span className="block text-muted-foreground">
              Signed {formatSignedAt(s.signedAt)} · version {s.docVersion}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SignForm({
  role,
  statement,
  onSign,
  disabled,
  verification,
}: {
  role: "parent" | "nanny";
  statement: string;
  onSign: (name: string, role: "parent" | "nanny", verification?: { email: string; code: string }) => Promise<void>;
  disabled?: boolean;
  /** When set and required, the signer proves an email address with a one-time code before signing. */
  verification?: { required: boolean; accountEmail: string | null; onRequestCode: (email: string) => Promise<boolean> };
}) {
  const t = useT();
  const needsCode = !!verification?.required && !verification.accountEmail;
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSign(name, role, needsCode ? { email, code } : undefined);
          setName("");
          setCode("");
          setAgreed(false);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className="text-sm font-medium text-foreground">
          {role === "parent" ? "Parent / employer full name" : "Nanny / manny full name"}
        </span>
        <Input
          className="mt-1.5"
          value={name}
          placeholder="Type your full name"
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />
      </label>
      {verification?.required && verification.accountEmail && (
        <p className="text-sm text-muted-foreground">{t("sign.signingAs", { email: verification.accountEmail })}</p>
      )}
      {needsCode && (
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-medium text-foreground">{t("sign.email")}</span>
            <Input className="mt-1.5" type="email" value={email} placeholder={t("login.emailPlaceholder")} onChange={(e) => setEmail(e.target.value)} disabled={disabled} />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !email.includes("@")}
            onClick={async () => setCodeSent(await verification!.onRequestCode(email))}
          >
            {t("sign.sendCode")}
          </Button>
          {codeSent && (
            <label className="block">
              <span className="text-sm text-muted-foreground">{t("sign.codeSent")}</span>
              <Input className="mt-1.5 tracking-[0.3em]" inputMode="numeric" maxLength={6} value={code} placeholder="123456" onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </label>
          )}
        </div>
      )}
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="mt-1"
          checked={agreed}
          disabled={disabled}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>{statement}</span>
      </label>
      <Button type="submit" disabled={disabled || busy || !agreed || name.trim().length < 3 || (needsCode && code.length !== 6)}>
        {busy ? "Signing…" : "Sign now"}
      </Button>
    </form>
  );
}
