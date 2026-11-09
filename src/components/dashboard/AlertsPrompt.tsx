import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const DISMISSED = "fw-alerts-prompt-dismissed";

/** Home-screen nudge to turn on phone alerts. Hidden once this device has them on, or the person says no thanks. */
export function AlertsPrompt({ slug }: { slug: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (slug === "demo") return;
    try {
      if (localStorage.getItem(DISMISSED) === "1") return;
    } catch {
      // Private browsing can block storage; the prompt then simply shows each visit.
    }
    if ("Notification" in window && Notification.permission === "denied") return;
    let cancelled = false;
    const subscribed =
      "serviceWorker" in navigator
        ? navigator.serviceWorker
            .getRegistration("/sw.js")
            .then((reg) => reg?.pushManager.getSubscription())
            .then((sub) => Boolean(sub))
            .catch(() => false)
        : Promise.resolve(false);
    void subscribed.then((on) => {
      if (!cancelled && !on) setShow(true);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!show) return null;
  return (
    <section className="surface-card flex items-start gap-3 p-4">
      <span className="ios-icon">
        <Bell className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">Know the moment something new arrives</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Get a quiet phone alert when notes, photos, key information, schedule changes or holiday requests are added. Nothing private shows on the lock screen.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Button asChild size="sm">
            <Link to="/notifications/$slug" params={{ slug }}>
              Turn on alerts
            </Link>
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground underline underline-offset-4"
            onClick={() => {
              try {
                localStorage.setItem(DISMISSED, "1");
              } catch {
                // Nothing to remember; hide it for this visit only.
              }
              setShow(false);
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
