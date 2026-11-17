import { createFileRoute } from "@tanstack/react-router";
import { Apple, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { MarketingLayout, frame } from "@/components/MarketingLayout";
import { ANDROID_APP_URL, IOS_APP_URL } from "@/lib/app-links";
import { pageHead } from "@/lib/seo";
import { PUBLIC_SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

// Where every "Download" button on the site leads. A phone sees its own store's button; a computer sees a QR code
// that opens this same page on the phone. The store links live in app-links.ts and are empty until each app is live,
// so nothing here points at a store page that does not exist yet.

export const Route = createFileRoute("/download")({
  validateSearch: (search: Record<string, unknown>): { from?: "qr" } =>
    search["from"] === "qr" ? { from: "qr" } : {},
  head: () =>
    pageHead({
      title: "Download Family Wallet for iPhone and Android",
      description:
        "Get the Family Wallet app on your phone. £9.99 a month or £99.99 a year for your whole household, subscribed in the app. Nannies and staff join free.",
      path: "/download",
    }),
  component: DownloadPage,
});

type Device = "ios" | "android" | "desktop";
const QR_TARGET = `${PUBLIC_SITE_URL}/download?from=qr`;

function StoreButton({ store, primary }: { store: "ios" | "android"; primary?: boolean }) {
  const url = store === "ios" ? IOS_APP_URL : ANDROID_APP_URL;
  const Icon = store === "ios" ? Apple : Smartphone;
  const label = store === "ios" ? "Download on the App Store" : "Get it on Google Play";
  const soon = store === "ios" ? "Coming soon to the App Store" : "Coming soon to Google Play";
  const base =
    "inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full px-7 text-base font-medium sm:w-auto";
  const tone = primary
    ? "bg-brand text-brand-foreground"
    : "border border-foreground/25 text-foreground";
  return url ? (
    <a href={url} className={cn(base, tone, "transition-opacity hover:opacity-90")}>
      <Icon className="size-5" aria-hidden /> {label}
    </a>
  ) : (
    <span aria-disabled="true" className={cn(base, tone, "cursor-default opacity-60")}>
      <Icon className="size-5" aria-hidden /> {soon}
    </span>
  );
}

function DownloadPage() {
  const { from } = Route.useSearch();
  const [device, setDevice] = useState<Device | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    // iPadOS reports itself as a Mac, so a touch-screen "Mac" is counted as an iPad.
    const ios =
      /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const found: Device = ios ? "ios" : /Android/.test(ua) ? "android" : "desktop";
    setDevice(found);
    // Someone who scanned the code goes straight to their store, once that store's link exists.
    const store = found === "ios" ? IOS_APP_URL : found === "android" ? ANDROID_APP_URL : "";
    if (from === "qr" && store) window.location.replace(store);
    if (found === "desktop") {
      QRCode.toDataURL(QR_TARGET, {
        margin: 1,
        width: 440,
        color: { dark: "#1a382b", light: "#ffffff" },
      }).then(setQr, () => setQr(null));
    }
  }, [from]);

  const live = Boolean(IOS_APP_URL || ANDROID_APP_URL);

  return (
    <MarketingLayout>
      <main className={cn(frame, "py-16 sm:py-24")}>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="heading-serif text-balance text-[2.5rem] leading-[1.05] text-foreground sm:text-[3.5rem]">
            Get Family Wallet on your phone
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[1.0625rem] leading-7 text-muted-foreground">
            Family Wallet is a phone app. Download it, set up your household and subscribe inside
            the app: £9.99 a month or £99.99 a year for everyone in your home. Nannies, au pairs and
            staff join free.
          </p>

          {/* Until the page knows the device, both buttons show; then a phone sees its own store first. */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {device !== "android" && <StoreButton store="ios" primary />}
            {device !== "ios" && <StoreButton store="android" primary={device === "android"} />}
          </div>
          {device === "ios" && !IOS_APP_URL && (
            <p className="mt-4 text-sm text-muted-foreground">
              The iPhone app is with Apple for review. Check back soon.
            </p>
          )}
          {device === "android" && !ANDROID_APP_URL && (
            <p className="mt-4 text-sm text-muted-foreground">
              The Android app is on its way. The iPhone app comes first.
            </p>
          )}

          {device === "desktop" && (
            <div className="mx-auto mt-12 max-w-sm rounded-3xl bg-card p-8 ring-1 ring-border">
              {qr ? (
                <img
                  src={qr}
                  alt="QR code that opens the Family Wallet download page on your phone"
                  width={220}
                  height={220}
                  className="mx-auto rounded-xl"
                />
              ) : (
                <div className="mx-auto size-[220px] rounded-xl bg-muted" aria-hidden />
              )}
              <p className="mt-5 font-medium text-foreground">
                Scan to download Family Wallet on your phone
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Point your phone’s camera at the code. It opens this page on your phone
                {live
                  ? " and takes you to your app store."
                  : ", where the store links will appear as each app goes live."}
              </p>
            </div>
          )}

          <p className="mx-auto mt-12 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Given a code by your agency or by a family? Download the app, create your account, then
            tap “I have a code from a family or agency” and type the code you were sent.
          </p>
        </div>
      </main>
    </MarketingLayout>
  );
}
