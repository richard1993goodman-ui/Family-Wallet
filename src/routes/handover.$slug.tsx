import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, ClipboardCheck, HandCoins, ReceiptText, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  addExpenseFn,
  deleteExpenseFn,
  deleteHandoverFn,
  getHandover,
  reviewExpenseFn,
  saveHandoverFn,
} from "@/lib/passport-handover.functions";
import { EXPENSE_CATEGORIES } from "@/lib/passport-handover.types";
import { Card, Field, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/handover/$slug")({
  head: () => ({
    meta: [
      { title: "Handover & Expenses — The Family Wallet" },
      {
        name: "description",
        content:
          "A quick end-of-day handover for homework, dinner, mood and kit, plus petty cash and expenses in the Family Wallet.",
      },
      { property: "og:title", content: "Handover & Expenses — The Family Wallet" },
      {
        property: "og:description",
        content: "End-of-day updates and small expenses in your Family Wallet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HandoverPage,
});

const today = () => new Date().toISOString().slice(0, 10);

const emptyHandover = {
  nannyId: "",
  handoverDate: today(),
  homeworkStatus: "",
  dinnerStatus: "",
  waterStatus: "",
  mood: "",
  energy: "",
  schoolBagReady: false,
  peKitReady: false,
  readingDone: false,
  tomorrowNotes: "",
  parentNotes: "",
};

const emptyExpense = {
  nannyId: "",
  expenseDate: today(),
  item: "",
  amount: 0,
  category: "other",
  notes: "",
};

function HandoverPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const loadFn = useServerFn(getHandover);
  const saveFn = useServerFn(saveHandoverFn);
  const addExpense = useServerFn(addExpenseFn);
  const reviewExpense = useServerFn(reviewExpenseFn);
  const removeExpense = useServerFn(deleteExpenseFn);
  const removeHandover = useServerFn(deleteHandoverFn);

  const query = useQuery({ queryKey: ["handover", slug], queryFn: () => loadFn({ data: { slug } }) });
  const [handover, setHandover] = useState({ ...emptyHandover });
  const [expense, setExpense] = useState({ ...emptyExpense });
  const [savingHandover, setSavingHandover] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

  useEffect(() => {
    if (!query.data?.nannies.length) return;
    const first = query.data.nannies[0];
    if (first && !handover.nannyId) setHandover((current) => ({ ...current, nannyId: first.id }));
    if (first && !expense.nannyId) setExpense((current) => ({ ...current, nannyId: first.id }));
  }, [query.data, handover.nannyId, expense.nannyId]);

  if (query.isLoading) {
    return (
      <PageLoading />
    );
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  const data = query.data;
  const isFamily = data.access === "family";
  const latest = data.handovers[0];
  const refresh = () => client.invalidateQueries({ queryKey: ["handover", slug] });

  async function saveDailyHandover() {
    setSavingHandover(true);
    try {
      await saveFn({ data: { slug, handover } });
      setHandover({ ...emptyHandover, nannyId: data.nannies[0]?.id ?? "" });
      await refresh();
      toast.success("Handover saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That handover could not be saved.");
    } finally {
      setSavingHandover(false);
    }
  }

  async function saveExpense() {
    setSavingExpense(true);
    try {
      await addExpense({ data: { slug, expense } });
      setExpense({ ...emptyExpense, nannyId: data.nannies[0]?.id ?? "" });
      await refresh();
      toast.success(isFamily ? "Expense recorded" : "Expense sent to parent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That expense could not be saved.");
    } finally {
      setSavingExpense(false);
    }
  }

  return (
    <HubPage
      slug={slug}
      title="Handover & expenses"
      intro="A quick end-of-day wrap: homework, dinner, mood, tomorrow's kit and small costs to reimburse."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={ClipboardCheck} label="Handovers" value={data.handovers.length} />
        <SummaryCard icon={ReceiptText} label="Expenses" value={data.expenses.length} />
        <SummaryCard icon={HandCoins} label="Awaiting" value={`£${data.pendingTotal.toFixed(2)}`} />
      </div>

      {latest && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Latest handover
          </p>
          <p className="mt-2 font-medium text-foreground">
            {formatDate(latest.handoverDate)} · {latest.nannyName}
          </p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <Detail label="Homework" value={latest.homeworkStatus} />
            <Detail label="Dinner" value={latest.dinnerStatus} />
            <Detail label="Mood" value={latest.mood} />
            <Detail label="Energy" value={latest.energy} />
          </div>
        </Card>
      )}

      <Card>
        <h2 className="heading-display text-xl text-foreground">End-of-day checklist</h2>
        {data.nannies.length > 1 && isFamily && (
          <div className="mt-4">
            <span className="text-sm font-medium text-foreground">Nanny</span>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={handover.nannyId}
              onChange={(event) => setHandover({ ...handover, nannyId: event.target.value })}
            >
              {data.nannies.map((nanny) => (
                <option key={nanny.id} value={nanny.id}>
                  {nanny.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Date"
            type="date"
            value={handover.handoverDate}
            onChange={(value) => setHandover({ ...handover, handoverDate: value })}
          />
          <Field
            label="Homework"
            value={handover.homeworkStatus}
            placeholder="Complete, reading left, none set…"
            onChange={(value) => setHandover({ ...handover, homeworkStatus: value })}
          />
          <Field
            label="Dinner"
            value={handover.dinnerStatus}
            placeholder="Ate well, light dinner, snack only…"
            onChange={(value) => setHandover({ ...handover, dinnerStatus: value })}
          />
          <Field
            label="Water"
            value={handover.waterStatus}
            placeholder="Bottle finished, needs more water…"
            onChange={(value) => setHandover({ ...handover, waterStatus: value })}
          />
          <Field
            label="Mood"
            value={handover.mood}
            placeholder="Happy, tired, overstimulated…"
            onChange={(value) => setHandover({ ...handover, mood: value })}
          />
          <Field
            label="Energy"
            value={handover.energy}
            placeholder="High, calm, ready for bed…"
            onChange={(value) => setHandover({ ...handover, energy: value })}
          />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <ToggleDone
            label="School bag ready"
            checked={handover.schoolBagReady}
            onChange={() => setHandover({ ...handover, schoolBagReady: !handover.schoolBagReady })}
          />
          <ToggleDone
            label="PE kit ready"
            checked={handover.peKitReady}
            onChange={() => setHandover({ ...handover, peKitReady: !handover.peKitReady })}
          />
          <ToggleDone
            label="Reading done"
            checked={handover.readingDone}
            onChange={() => setHandover({ ...handover, readingDone: !handover.readingDone })}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Tomorrow"
            textarea
            value={handover.tomorrowNotes}
            onChange={(value) => setHandover({ ...handover, tomorrowNotes: value })}
          />
          <Field
            label="Parent note"
            textarea
            value={handover.parentNotes}
            onChange={(value) => setHandover({ ...handover, parentNotes: value })}
          />
        </div>
        <Button className="mt-4" onClick={saveDailyHandover} disabled={savingHandover}>
          <ClipboardCheck className="h-4 w-4" /> {savingHandover ? "Saving…" : "Save handover"}
        </Button>
      </Card>

      <Card>
        <h2 className="heading-display text-xl text-foreground">Expenses</h2>
        {data.nannies.length > 1 && isFamily && (
          <div className="mt-4">
            <span className="text-sm font-medium text-foreground">Nanny</span>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={expense.nannyId}
              onChange={(event) => setExpense({ ...expense, nannyId: event.target.value })}
            >
              {data.nannies.map((nanny) => (
                <option key={nanny.id} value={nanny.id}>
                  {nanny.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Date"
            type="date"
            value={expense.expenseDate}
            onChange={(value) => setExpense({ ...expense, expenseDate: value })}
          />
          <Field
            label="Amount"
            type="number"
            value={String(expense.amount)}
            onChange={(value) => setExpense({ ...expense, amount: Number(value) })}
          />
          <Field
            label="What was it for?"
            value={expense.item}
            placeholder="Bus fare, snacks, soft play…"
            onChange={(value) => setExpense({ ...expense, item: value })}
          />
          <div>
            <span className="text-sm font-medium text-foreground">Category</span>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={expense.category}
              onChange={(event) => setExpense({ ...expense, category: event.target.value })}
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Field
            label="Notes"
            textarea
            value={expense.notes}
            onChange={(value) => setExpense({ ...expense, notes: value })}
          />
        </div>
        <Button className="mt-4" onClick={saveExpense} disabled={savingExpense}>
          <ReceiptText className="h-4 w-4" /> {savingExpense ? "Saving…" : "Add expense"}
        </Button>
      </Card>

      <h2 className="heading-display mt-8 text-xl text-foreground">Recent handovers</h2>
      <div className="mt-3 space-y-3">
        {data.handovers.length === 0 && <p className="text-sm text-muted-foreground">No handovers yet.</p>}
        {data.handovers.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{formatDate(item.handoverDate)} · {item.nannyName}</p>
                <p className="mt-1 text-xs text-muted-foreground">Added by {item.submittedByName ?? item.submittedBy}</p>
              </div>
              {isFamily && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove handover"
                  onClick={async () => {
                    await removeHandover({ data: { slug, id: item.id } });
                    await refresh();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <Detail label="Homework" value={item.homeworkStatus} />
              <Detail label="Dinner" value={item.dinnerStatus} />
              <Detail label="Water" value={item.waterStatus} />
              <Detail label="Mood" value={item.mood} />
              <Detail label="Energy" value={item.energy} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {item.schoolBagReady && <span className="rounded-full bg-muted px-2.5 py-1">School bag ready</span>}
              {item.peKitReady && <span className="rounded-full bg-muted px-2.5 py-1">PE kit ready</span>}
              {item.readingDone && <span className="rounded-full bg-muted px-2.5 py-1">Reading done</span>}
            </div>
            <Detail className="mt-3" label="Tomorrow" value={item.tomorrowNotes} />
            <Detail className="mt-2" label="Parent note" value={item.parentNotes} />
          </Card>
        ))}
      </div>

      <h2 className="heading-display mt-8 text-xl text-foreground">Expenses</h2>
      <div className="mt-3 space-y-3">
        {data.expenses.length === 0 && <p className="text-sm text-muted-foreground">No expenses yet.</p>}
        {data.expenses.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">£{item.amount.toFixed(2)} · {item.item}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(item.expenseDate)} · {item.nannyName} · {EXPENSE_CATEGORIES.find((category) => category.value === item.category)?.label ?? item.category}
                </p>
                {item.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{item.notes}</p>}
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">
                {item.status}
              </span>
            </div>
            {isFamily && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={async () => {
                        await reviewExpense({ data: { slug, id: item.id, status: "reimbursed" } });
                        await refresh();
                        toast.success("Expense marked reimbursed");
                      }}
                    >
                      <Check className="h-4 w-4" /> Reimbursed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await reviewExpense({ data: { slug, id: item.id, status: "declined" } });
                        await refresh();
                      }}
                    >
                      <X className="h-4 w-4" /> Decline
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await removeExpense({ data: { slug, id: item.id } });
                    await refresh();
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </HubPage>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="heading-display mt-3 text-2xl text-foreground">{value}</p>
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    </div>
  );
}

function ToggleDone({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <Button type="button" variant={checked ? "default" : "outline"} onClick={onChange} className="justify-start">
      <Check className="h-4 w-4" /> {label}
    </Button>
  );
}

function Detail({ label, value, className = "" }: { label: string; value: string | null; className?: string }) {
  if (!value) return null;
  return (
    <p className={`whitespace-pre-line text-sm text-muted-foreground ${className}`}>
      <span className="font-medium text-foreground">{label}: </span>
      {value}
    </p>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
