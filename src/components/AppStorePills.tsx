import { Apple, Smartphone } from "lucide-react";

import { ANDROID_APP_URL, IOS_APP_URL } from "@/lib/app-links";
import { cn } from "@/lib/utils";

const pill =
  "inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.9375rem] font-medium transition-[opacity,scale] duration-150";

/** Download pills for the iOS and Android apps. Unlinked (and marked "soon") until the store URLs are set in app-links.ts. */
export function AppStorePills({ className }: { className?: string }) {
  const items = [
    { label: "Download for iOS", url: IOS_APP_URL, Icon: Apple, tone: "bg-brand text-brand-foreground" },
    { label: "Download for Android", url: ANDROID_APP_URL, Icon: Smartphone, tone: "border border-foreground/25 text-foreground" },
  ];
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {items.map(({ label, url, Icon, tone }) =>
        url ? (
          <a key={label} href={url} className={cn(pill, tone, "hover:opacity-90 active:scale-[0.97]")}>
            <Icon className="size-4" aria-hidden /> {label}
          </a>
        ) : (
          <span key={label} role="link" aria-disabled="true" title="Coming soon" className={cn(pill, tone, "cursor-default opacity-60")}>
            <Icon className="size-4" aria-hidden /> {label}
            <span className="ml-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs">Soon</span>
          </span>
        ),
      )}
    </div>
  );
}
