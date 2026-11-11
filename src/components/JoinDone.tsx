import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";

export type JoinResult = { url: string; code: string; nannyName: string | null };

/** Shown once, after a family redeems its invitation: its own wallet link and access code. */
export function JoinDone({ done }: { done: JoinResult }) {
  const accountsOn = import.meta.env["VITE_ACCOUNTS_ENABLED"] === "true";
  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      <h1 className="heading-display text-2xl text-foreground">Your wallet is ready</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Save these now. We've also emailed them to you if we have your address. Only your family can open your wallet.
        {done.nannyName && ` ${done.nannyName} has been added to your household staff and has been emailed their own sign-in.`}
      </p>
      <p className="mt-4 text-xs font-medium text-muted-foreground">Your private link</p>
      <p className="break-all text-sm text-foreground">{done.url}</p>
      <p className="mt-3 text-xs font-medium text-muted-foreground">Access code</p>
      <p className="heading-display text-3xl tracking-[0.2em] text-foreground">{done.code}</p>
      <div className="mt-4 flex gap-2">
        <CopyButton text={`${done.url}\nCode: ${done.code}`} label="Copy both" />
        <Button asChild>
          <a href={done.url}>Open my wallet</a>
        </Button>
      </div>
      {accountsOn && (
        <p className="mt-4 text-xs text-muted-foreground">
          Once you're in, choose "My login" in the menu to sign in with your email instead. Your code stays as a backup.
        </p>
      )}
    </div>
  );
}
