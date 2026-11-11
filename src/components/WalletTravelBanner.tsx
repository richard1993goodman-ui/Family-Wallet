import { formatDate } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Plane } from "lucide-react";
import { useState } from "react";

import { getTravel } from "@/lib/travel.functions";

const fmt = (d: string) =>
  formatDate(`${d}T00:00:00Z`, { day: "numeric", month: "short", timeZone: "UTC" });

/** Travel mode: a slim strip at the top of the wallet while a trip is on (or coming up within 14 days). */
export function WalletTravelBanner({ slug }: { slug: string }) {
  const fn = useServerFn(getTravel);
  const { data } = useQuery({ queryKey: ["travel", slug], queryFn: () => fn({ data: { slug } }) });
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const trip = data.active ?? data.upcoming;
  if (!trip) return null;
  const soon = !data.active && (new Date(`${trip.startDate}T00:00:00Z`).getTime() - Date.now()) / 86400000 <= 14;
  if (!data.active && !soon) return null;
  const done = trip.checklist.filter((i) => i.done).length;
  const pct = trip.checklist.length ? Math.round((done / trip.checklist.length) * 100) : 0;
  const label = data.active ? "Travel mode is on" : "Trip coming up";

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-brand/25 bg-brand-soft">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="travel-pack"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-soft/70"
      >
        <Plane className="h-4 w-4 flex-shrink-0 text-brand" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {label} · {trip.destination}
          </span>
          <span className="num block truncate text-xs text-muted-foreground">
            {fmt(trip.startDate)} – {fmt(trip.endDate)} · Packing {done}/{trip.checklist.length}
          </span>
        </span>
        <span className="hidden flex-shrink-0 text-xs font-medium text-brand sm:block">
          {open ? "Hide details" : "Expand for details"}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-brand transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id="travel-pack"
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-brand/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand/15">
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
              <span className="num text-xs text-muted-foreground">
                {done}/{trip.checklist.length} packed
              </span>
            </div>
            {trip.localEmergency && (
              <p className="mt-2 text-xs text-muted-foreground">
                Local emergency <span className="num font-medium text-foreground">{trip.localEmergency}</span>
              </p>
            )}
            <Link
              to="/travel/$slug"
              params={{ slug }}
              className="mt-2 inline-block text-sm font-medium text-brand underline underline-offset-4"
            >
              Open travel pack &amp; handover notes →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
