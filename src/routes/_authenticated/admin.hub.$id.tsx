import { requireTwoStepClient } from "@/lib/two-step";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";

import { getFamilyHub } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/hub/$id")({
  beforeLoad: () => requireTwoStepClient(),
  head: () => ({
    meta: [
      { title: "Family hub overview — The Family Wallet admin" },
      {
        name: "description",
        content: "Read-only view of a family's profile, children, planner and daily logs.",
      },
      { property: "og:title", content: "Family hub overview — The Family Wallet admin" },
      { property: "og:description", content: "See what a family has added to their wallet." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FamilyHubView,
});

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
      <span className="font-medium text-foreground">{label}: </span>
      {value}
    </p>
  );
}

function FamilyHubView() {
  const { id } = Route.useParams();
  const loadFn = useServerFn(getFamilyHub);
  const query = useQuery({ queryKey: ["admin-hub", id], queryFn: () => loadFn({ data: { id } }) });

  const data = query.data;

  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link
          to="/admin/family/$id"
          params={{ id }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to family
        </Link>
        <h1 className="heading-display mt-4 text-3xl text-primary">
          {data?.familyName ?? "Family"} hub
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Read-only. Families and their nanny fill this in themselves.
        </p>

        {query.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

        {data && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="heading-display text-lg text-foreground">Children</p>
              {data.children.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">None added yet.</p>
              )}
              {data.children.map((child) => (
                <div key={child.id} className="mt-3 border-t border-border pt-3 first:border-0 first:pt-0">
                  <p className="font-medium text-foreground">{child.name}</p>
                  <Row label="School" value={[child.year_group, child.school].filter(Boolean).join(" · ")} />
                  <Row label="Allergies" value={child.allergies} />
                  <Row label="Medication" value={child.medication} />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="heading-display text-lg text-foreground">Household</p>
              <Row label="Home" value={data.profile?.home_address} />
              <Row label="House rules" value={data.profile?.house_rules} />
              <Row label="GP" value={data.profile?.gp_details} />
              <Row label="Emergency instructions" value={data.profile?.emergency_instructions} />
              {!data.profile && <p className="mt-2 text-sm text-muted-foreground">Not filled in yet.</p>}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="heading-display text-lg text-foreground">Planner (from last week)</p>
              {data.entries.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">Nothing planned.</p>
              )}
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {data.entries.map((entry) => (
                  <li key={entry.id}>
                    {entry.entry_date} · {entry.time_label ?? ""} {entry.title}
                    {entry.child_name ? ` (${entry.child_name})` : ""}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="heading-display text-lg text-foreground">Recent daily logs</p>
              {data.logs.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">No updates yet.</p>
              )}
              {data.logs.map((log) => (
                <div key={log.id} className="mt-3 border-t border-border pt-3 first:border-0 first:pt-0">
                  <p className="font-medium text-foreground">{log.log_date}</p>
                  <Row label="Did" value={log.activities} />
                  <Row label="Ate" value={log.food} />
                  <Row label="Mood" value={log.mood} />
                  <Row label="Notes" value={log.notes} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
