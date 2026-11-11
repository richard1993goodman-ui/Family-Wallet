import { formatDate } from "@/lib/format";
/** Date and time wording for the home dashboards, in UK time. */

export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/London" })
      .format(now)
      .slice(0, 2),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function longDate(iso?: string) {
  const date = iso ? new Date(`${iso}T12:00:00Z`) : new Date();
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  });
}

export function shortDate(iso: string) {
  return formatDate(`${iso}T00:00:00Z`, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

/** Today's date in UK time, "YYYY-MM-DD". */
export function londonToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
}
