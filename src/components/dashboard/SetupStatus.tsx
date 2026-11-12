import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useT } from "@/lib/i18n/provider";

export type SetupItem = {
  label: string;
  done: boolean;
  hint: string;
  to:
    | "/agreement/$slug"
    | "/hours/$slug"
    | "/terms/$slug"
    | "/family/$slug"
    | "/emergency/$slug"
    | "/nannies/$slug"
    | "/permissions/$slug";
};

export function SetupStatus({ slug, items }: { slug: string; items: SetupItem[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const done = items.filter((item) => item.done).length;
  const total = items.length;
  const allDone = done === total;
  const outstanding = items.filter((item) => !item.done);
  if (allDone) return null;

  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.8125rem] font-medium text-muted-foreground">
            {t("dash.actionsToComplete")}
          </p>
          <p className="mt-0.5 font-medium text-foreground">
            {allDone ? t("dash.allComplete") : t("dash.stillToDo", { count: total - done })}
          </p>
        </div>
        <span className="num text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{done}</span> of {total} done
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${Math.round((done / total) * 100)}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2.5">
        {(open ? items : outstanding.slice(0, 3)).map((item) => (
          <li key={item.label}>
            <Link
              to={item.to}
              params={{ slug }}
              className="flex items-start gap-3 rounded-md px-1.5 py-1.5 transition-colors hover:bg-raised"
            >
              <span
                className={`mt-[5px] h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                  item.done ? "bg-brand" : "border border-foreground/40"
                }`}
              />
              <span className="text-sm">
                <span
                  className={`block font-medium ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                >
                  {item.label}
                </span>
                {!item.done && <span className="block text-muted-foreground">{item.hint}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        to="/start/$slug"
        params={{ slug }}
        className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Continue setup
      </Link>

      {(outstanding.length > 3 || open) && (
        <button
          className="mt-3 text-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
          onClick={() => setOpen(!open)}
        >
          {open ? t("dash.showLess") : t("dash.showAll", { count: total })}
        </button>
      )}
    </div>
  );
}
