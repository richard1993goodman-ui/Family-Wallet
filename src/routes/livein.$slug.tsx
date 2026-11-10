import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, Field, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { UpgradeToHousehold } from "@/components/UpgradeToHousehold";
import { Button } from "@/components/ui/button";
import { getLiveIn, logLiveInWeekFn, markPocketMoneyPaidFn, saveLiveInSettingsFn } from "@/lib/live-in.functions";
import { DEFAULT_LIVE_IN, mondayOf, weekWarnings, type LiveInSettings } from "@/lib/live-in.types";

export const Route = createFileRoute("/livein/$slug")({
  head: () => ({
    meta: [
      { title: "Au pair & live-in — The Family Wallet" },
      { name: "description", content: "Pocket money, weekly hours cap, days off, room and board and house rules for au pairs and live-in staff." },
      { property: "og:title", content: "Au pair & live-in — The Family Wallet" },
      { property: "og:description", content: "Keep live-in hours, days off and pocket money fair and clear." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LiveInPage,
});

const fmtWeek = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function LiveInPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const loadFn = useServerFn(getLiveIn);
  const saveFn = useServerFn(saveLiveInSettingsFn);
  const logFn = useServerFn(logLiveInWeekFn);
  const paidFn = useServerFn(markPocketMoneyPaidFn);
  const query = useQuery({ queryKey: ["live-in", slug], queryFn: () => loadFn({ data: { slug } }) });

  const [s, setS] = useState<LiveInSettings>(DEFAULT_LIVE_IN);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date().toISOString().slice(0, 10)));
  const [hours, setHours] = useState("");
  const [daysOff, setDaysOff] = useState("2");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loaded = query.data && !query.data.upgrade ? query.data.settings : null;
  useEffect(() => { if (loaded) setS(loaded); }, [loaded]);

  if (query.isLoading) return <PageLoading />;
  if (!query.data) return <LockedNotice slug={slug} />;
  const data = query.data;
  if (data.upgrade) return <UpgradeToHousehold slug={slug} title="Au pair & live-in" isNanny={data.access === "nanny"} what="Pocket money, hours caps, days off and house rules for live-in help are part of the Household plan." />;
  const isFamily = data.access === "family";
  const refresh = () => client.invalidateQueries({ queryKey: ["live-in", slug] });

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); await refresh(); toast.success(ok); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); }
    finally { setBusy(false); }
  };

  const num = (k: keyof LiveInSettings) => (v: string) => setS({ ...s, [k]: Number(v) });
  const str = (k: keyof LiveInSettings) => (v: string) => setS({ ...s, [k]: v });

  return (
    <HubPage slug={slug} title="Au pair & live-in" intro="For carers who live with you: agreed pocket money, a weekly hours cap, protected days off and the house rules, all in one fair place.">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><p className="text-sm text-muted-foreground">Pocket money</p><p className="heading-display mt-1 text-3xl text-primary">£{data.settings.weeklyPocketMoney.toFixed(2)}<span className="text-base text-muted-foreground"> /week</span></p></Card>
        <Card><p className="text-sm text-muted-foreground">Hours cap</p><p className="heading-display mt-1 text-3xl text-foreground">{data.settings.maxWeeklyHours}h<span className="text-base text-muted-foreground"> /week</span></p></Card>
        <Card><p className="text-sm text-muted-foreground">Days off</p><p className="heading-display mt-1 text-3xl text-foreground">{data.settings.daysOffPerWeek}<span className="text-base text-muted-foreground"> /week</span></p></Card>
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="font-semibold text-foreground">Log a week</h2>
          <p className="mt-1 text-sm text-muted-foreground">Total hours on duty (including babysitting) and full days off.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Week of" type="date" value={weekStart} onChange={setWeekStart} />
            <Field label="Hours worked" type="number" value={hours} onChange={setHours} placeholder="25" />
            <Field label="Full days off" type="number" value={daysOff} onChange={setDaysOff} />
          </div>
          <div className="mt-3"><Field label="Note (optional)" value={note} onChange={setNote} placeholder="Extra evening on Saturday" /></div>
          <Button className="mt-4" disabled={busy} onClick={() => run(async () => { await logFn({ data: { slug, week: { weekStart, hoursWorked: Number(hours), daysOff: Number(daysOff), note } } }); setHours(""); setNote(""); }, "Week saved")}>Save week</Button>
        </Card>
      </div>

      <h2 className="ios-section-title mt-8">Recent weeks</h2>
      <div className="ios-group mt-2">
        {data.weeks.length === 0 && <p className="p-5 text-sm text-muted-foreground">No weeks logged yet.</p>}
        {data.weeks.map((w) => {
          const warn = weekWarnings(w, data.settings);
          return (
            <div key={w.id} className="ios-row items-center">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground">Week of {fmtWeek(w.weekStart)} · {w.hoursWorked}h · {w.daysOff} days off</span>
                {w.note && <span className="mt-0.5 block text-xs text-muted-foreground">{w.note}</span>}
                {warn.length > 0 && <span className="mt-0.5 block text-xs font-medium text-destructive">{warn.join(" · ")}</span>}
              </span>
              {isFamily ? (
                <Button size="sm" variant={w.pocketMoneyPaid ? "outline" : "default"} disabled={busy} onClick={() => run(() => paidFn({ data: { slug, id: w.id, paid: !w.pocketMoneyPaid } }), w.pocketMoneyPaid ? "Marked unpaid" : "Pocket money marked paid")}>
                  {w.pocketMoneyPaid ? "Paid ✓" : "Mark paid"}
                </Button>
              ) : (
                <span className={`text-xs font-medium ${w.pocketMoneyPaid ? "text-primary" : "text-muted-foreground"}`}>{w.pocketMoneyPaid ? "Paid" : "Not yet paid"}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <Card>
          <h2 className="font-semibold text-foreground">The arrangement</h2>
          {isFamily ? (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Pocket money (£/week)" type="number" value={String(s.weeklyPocketMoney)} onChange={num("weeklyPocketMoney")} />
                <Field label="Max hours per week" type="number" value={String(s.maxWeeklyHours)} onChange={num("maxWeeklyHours")} />
                <Field label="Days off per week" type="number" value={String(s.daysOffPerWeek)} onChange={num("daysOffPerWeek")} />
              </div>
              <div className="mt-3 grid gap-3">
                <Field textarea label="Room & board" value={s.roomAndBoard} onChange={str("roomAndBoard")} placeholder="Own room, meals included, laundry…" />
                <Field textarea label="House rules for living in" value={s.houseRules} onChange={str("houseRules")} placeholder="Quiet hours, guests, curfew, shared spaces…" />
                <Field textarea label="Study & protected time" value={s.studySchedule} onChange={str("studySchedule")} placeholder="Language classes, college, gym…" />
              </div>
              <Button className="mt-4" disabled={busy} onClick={() => run(() => saveFn({ data: { slug, settings: s } }), "Arrangement saved")}>Save arrangement</Button>
            </>
          ) : (
            <dl className="mt-3 space-y-4 text-sm">
              {[["Room & board", data.settings.roomAndBoard], ["House rules", data.settings.houseRules], ["Study & protected time", data.settings.studySchedule]].map(([k, v]) => (
                <div key={k}><dt className="font-medium text-foreground">{k}</dt><dd className="mt-1 whitespace-pre-line text-muted-foreground">{v || "Not added yet."}</dd></div>
              ))}
            </dl>
          )}
        </Card>
      </div>
    </HubPage>
  );
}
