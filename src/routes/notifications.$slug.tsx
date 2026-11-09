import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import {
  getPushConfig,
  getPushPrefsFn,
  removePushSubscriptionFn,
  savePushPrefsFn,
  savePushSubscriptionFn,
} from "@/lib/notifications.functions";
import { getWalletSummary } from "@/lib/wallet.functions";

export const Route = createFileRoute("/notifications/$slug")({
  head: () => ({
    meta: [
      { title: "Notifications — The Family Wallet" },
      { name: "description", content: "Choose which updates send an alert to this phone." },
      { property: "og:title", content: "Notifications — The Family Wallet" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

function keyToBytes(base64Url: string) {
  const padded = base64Url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64Url.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function NotificationsPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const summaryFn = useServerFn(getWalletSummary);
  const configFn = useServerFn(getPushConfig);
  const subscribeFn = useServerFn(savePushSubscriptionFn);
  const unsubscribeFn = useServerFn(removePushSubscriptionFn);
  const prefsFn = useServerFn(getPushPrefsFn);
  const savePrefsFn = useServerFn(savePushPrefsFn);

  const summary = useQuery({ queryKey: ["wallet", slug], queryFn: () => summaryFn({ data: { slug } }) });
  const config = useQuery({ queryKey: ["push-config"], queryFn: () => configFn() });

  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  // iPhones and iPads only offer notifications to a wallet opened from the Home Screen, so a normal
  // Safari tab looks "unsupported". IPads can report themselves as a Mac, hence the touch check.
  const isApple =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  const iosNeedsInstall = isApple && !(navigator as Navigator & { standalone?: boolean }).standalone;

  useEffect(() => {
    if (!supported) return;
    void navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? null))
      .catch(() => undefined);
  }, [supported]);

  const prefs = useQuery({
    queryKey: ["push-prefs", slug, endpoint],
    queryFn: () => prefsFn({ data: { slug, endpoint: endpoint ?? "" } }),
    enabled: Boolean(endpoint),
  });

  if (summary.isLoading) return <PageLoading />;
  if (!summary.data?.unlocked) return <LockedNotice slug={slug} />;

  const enabled = Boolean(endpoint) && prefs.data?.subscribed === true;
  const muted = prefs.data?.muted ?? [];
  const quietStart = prefs.data?.quietStart ?? null;
  const quietEnd = prefs.data?.quietEnd ?? null;

  const turnOn = async () => {
    const publicKey = config.data?.publicKey;
    if (!publicKey) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      if ((await Notification.requestPermission()) !== "granted") {
        toast.error("Notifications are blocked. Allow them for this site in your browser settings.");
        return;
      }
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
      await subscribeFn({ data: { slug, endpoint: sub.endpoint, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
      setEndpoint(sub.endpoint);
      await client.invalidateQueries({ queryKey: ["push-prefs", slug] });
      toast.success("Notifications are on for this device");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't turn notifications on");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    if (!endpoint) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      await unsubscribeFn({ data: { slug, endpoint } });
      await sub?.unsubscribe();
      setEndpoint(null);
      toast.success("Notifications are off for this device");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't turn notifications off");
    } finally {
      setBusy(false);
    }
  };

  const savePrefs = async (next: { muted: string[]; quietStart: number | null; quietEnd: number | null }) => {
    if (!endpoint) return;
    try {
      await savePrefsFn({ data: { slug, endpoint, ...next } });
      await client.invalidateQueries({ queryKey: ["push-prefs", slug] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that");
    }
  };

  return (
    <HubPage
      slug={slug}
      title="Notifications"
      intro="Numbers in the menu show what the other person changed since you last looked. Turn on alerts to get the important ones on this phone too."
    >
      <Card>
        <h2 className="font-semibold text-foreground">Alerts on this device</h2>
        {iosNeedsInstall ? (
          <p className="mt-2 text-sm text-muted-foreground">
            On iPhone and iPad, add the wallet to your Home Screen first: tap Share, then Add to Home Screen. Then open the wallet from the new icon and come back to this page to turn alerts on.
          </p>
        ) : !supported ? (
          <p className="mt-2 text-sm text-muted-foreground">
            This browser can't receive alerts. Try Safari or Chrome rather than a browser inside another app (such as the one that opens from an email or WhatsApp link). The numbers in the menu still work.
          </p>
        ) : !config.data?.publicKey ? (
          <p className="mt-2 text-sm text-muted-foreground">Alerts aren't switched on for this wallet yet.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Alerts never show what was written, only that something is waiting, so nothing private appears on a lock screen.
            </p>
            <Button className="mt-4" disabled={busy} variant={enabled ? "outline" : "default"} onClick={enabled ? turnOff : turnOn}>
              {busy ? "Working…" : enabled ? "Turn off alerts on this device" : "Turn on alerts"}
            </Button>
          </>
        )}
      </Card>

      {enabled && config.data && (
        <>
          <h2 className="ios-section-title mt-8">Send an alert for</h2>
          <div className="ios-group mt-2">
            {config.data.features.map((f) => {
              const on = !muted.includes(f.key);
              return (
                <label key={f.key} className="ios-row items-center">
                  <span className="min-w-0 flex-1 font-medium text-foreground">{f.label}</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={on}
                    onChange={() =>
                      void savePrefs({ muted: on ? [...muted, f.key] : muted.filter((k) => k !== f.key), quietStart, quietEnd })
                    }
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-6">
            <Card>
              <h2 className="font-semibold text-foreground">Quiet hours</h2>
              <p className="mt-1 text-sm text-muted-foreground">No alerts between these times. They'll show up when quiet hours end.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  From
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1"
                    value={quietStart ?? ""}
                    onChange={(e) => void savePrefs({ muted, quietStart: e.target.value === "" ? null : Number(e.target.value), quietEnd })}
                  >
                    <option value="">Off</option>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{hourLabel(h)}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  To
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1"
                    value={quietEnd ?? ""}
                    onChange={(e) => void savePrefs({ muted, quietStart, quietEnd: e.target.value === "" ? null : Number(e.target.value) })}
                  >
                    <option value="">Off</option>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{hourLabel(h)}</option>
                    ))}
                  </select>
                </label>
              </div>
            </Card>
          </div>
        </>
      )}
    </HubPage>
  );
}
