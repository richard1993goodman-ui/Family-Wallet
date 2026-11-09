import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check } from "lucide-react";

import { getInbox, markSeenFn } from "@/lib/notifications.functions";
import { PUSH_FEATURES } from "@/lib/push";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Item = { id: string; feature: string; summary: string; createdAt: string };

const LABELS: Record<string, string> = Object.fromEntries(PUSH_FEATURES.map((f) => [f.key, f.label]));

/** Fictional notifications for the public demo wallet; ticking them only hides them on this visit. */
const DEMO_ITEMS: Item[] = [
  { id: "d1", feature: "moments", summary: "Jess added 3 photos from the park", createdAt: new Date(Date.now() - 12 * 60_000).toISOString() },
  { id: "d2", feature: "log", summary: "Today's daily update is ready", createdAt: new Date(Date.now() - 45 * 60_000).toISOString() },
  { id: "d3", feature: "planner", summary: "Jess asked to swap Thursday's shift", createdAt: new Date(Date.now() - 3 * 3600_000).toISOString() },
  { id: "d4", feature: "leave", summary: "New holiday request for half term", createdAt: new Date(Date.now() - 26 * 3600_000).toISOString() },
];

function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

export function NotificationBell({ slug }: { slug: string }) {
  const demo = slug === "demo";
  const [open, setOpen] = useState(false);
  const [demoItems, setDemoItems] = useState(DEMO_ITEMS);
  const client = useQueryClient();
  const navigate = useNavigate();
  const inboxFn = useServerFn(getInbox);
  const seenFn = useServerFn(markSeenFn);
  const query = useQuery({
    queryKey: ["inbox", slug],
    queryFn: () => inboxFn({ data: { slug } }),
    enabled: !demo,
    refetchInterval: 60_000,
  });
  const items = demo ? demoItems : (query.data ?? []);

  async function tick(feature: string, id?: string) {
    if (demo) {
      setDemoItems((list) => list.filter((i) => (id ? i.id !== id : i.feature !== feature)));
      return;
    }
    client.setQueryData<Item[]>(["inbox", slug], (list) => (list ?? []).filter((i) => i.feature !== feature));
    await seenFn({ data: { slug, feature } }).catch(() => undefined);
    void client.invalidateQueries({ queryKey: ["badges", slug] });
    void client.invalidateQueries({ queryKey: ["inbox", slug] });
  }

  async function tickAll() {
    if (demo) return setDemoItems([]);
    const features = [...new Set(items.map((i) => i.feature))];
    await Promise.all(features.map((f) => tick(f)));
  }

  function openItem(item: Item) {
    void tick(item.feature, item.id);
    setOpen(false);
    if (!demo) void navigate({ to: `/${item.feature}/$slug` as "/messages/$slug", params: { slug } });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 flex-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={items.length ? `Notifications, ${items.length} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {items.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {items.length > 9 ? "9+" : items.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {items.length > 0 && (
            <button type="button" onClick={() => void tickAll()} className="text-xs font-medium text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-2 px-4 py-3">
                <button type="button" onClick={() => openItem(item)} className="min-w-0 flex-1 text-left">
                  <p className="text-sm text-foreground">{item.summary}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {LABELS[item.feature] ?? "Update"} · {ago(item.createdAt)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => void tick(item.feature, item.id)}
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary"
                  aria-label="Mark as read"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
