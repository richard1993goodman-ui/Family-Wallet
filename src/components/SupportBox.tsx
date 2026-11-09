import { Link } from "@tanstack/react-router";
import { LifeBuoy, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL, siteUrl } from "@/lib/site";

/** "Need help?" card: email support, with the family's name and wallet link filled in (never the access code). */
export function SupportBox({ slug, familyName, showInWalletLink = true }: { slug: string; familyName: string; showInWalletLink?: boolean }) {
  const subject = `Family Wallet support: ${familyName}`;
  const body = `Family: ${familyName}\nWallet: ${siteUrl(`/w/${slug}`)}\n\nHow can we help?\n`;
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <section className="surface-card flex items-start gap-3 p-4">
      <span className="ios-icon">
        <LifeBuoy className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">Need help?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Email us at <span className="font-medium text-foreground">{CONTACT_EMAIL}</span> and we'll get back to you.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button asChild size="sm">
            <a href={href}>
              <Mail aria-hidden /> Email support
            </a>
          </Button>
          {showInWalletLink && (
            <Link to="/support/$slug" params={{ slug }} className="text-sm text-muted-foreground underline underline-offset-4">
              Or send a message in the wallet
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
