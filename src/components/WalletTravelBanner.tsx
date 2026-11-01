import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plane } from "lucide-react";

import { getTravel } from "@/lib/travel.functions";

const fmt = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Travel mode: shown at the top of the wallet while a trip is on (or coming up within 14 days). */
export function WalletTravelBanner({ slug }: { slug: string }) {
  const fn = useServerFn(getTravel);
  const { data } = useQuery({ queryKey: ["travel", slug], queryFn: () => fn({ data: { slug } }) });
  if (!data) return null;
  const trip = data.active ?? data.upcoming;
  if (!trip) return null;
  const soon = !data.active && (new Date(`${trip.startDate}T00:00:00Z`).getTime() - Date.now()) / 86400000 <= 14;
  if (!data.active && !soon) return null;
  const done = trip.checklist.filter((i) => i.done).length;

  return (
    <Link
      to="/travel/$slug"
      params={{ slug }}
      className="mb-6 block rounded-2xl border-2 border-primary bg-primary p-5 text-primary-foreground"
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest opacity-80">
        <Plane className="h-4 w-4" /> {data.active ? "Travel mode is on" : "Trip coming up"}
      </p>
      <p className="heading-display mt-1 text-2xl">{trip.destination}</p>
      <p className="mt-1 text-sm opacity-90">
        {fmt(trip.startDate)} – {fmt(trip.endDate)} · Checklist {done}/{trip.checklist.length}
        {trip.localEmergency ? ` · Local emergency ${trip.localEmergency}` : ""}
      </p>
      <p className="mt-2 text-sm font-medium underline underline-offset-4">Open travel pack &amp; handover notes →</p>
    </Link>
  );
}
