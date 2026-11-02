import { Link } from "@tanstack/react-router";
import { useState } from "react";

export type SetupItem = {
  label: string;
  done: boolean;
  hint: string;
  to: "/agreement/$slug" | "/terms/$slug" | "/family/$slug" | "/emergency/$slug" | "/nannies/$slug";
};

export function SetupStatus({ slug, items }: { slug: string; items: SetupItem[] }) {
  const [open, setOpen] = useState(false);
  const done = items.filter((item) => item.done).length;
  const total = items.length;
  const allDone = done === total;
  const outstanding = items.filter((item) => !item.done);
  if (allDone) return null;
  const barColour = allDone
    ? "bg-emerald-600"
    : done >= total / 2
      ? "bg-amber-500"
      : "bg-destructive";

  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Actions to complete
          </p>
          <p className="mt-1 font-medium text-foreground">
            {allDone ? "Everything is complete" : `${total - done} still to do`}
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {done} of {total}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${barColour}`}
          style={{ width: `${Math.round((done / total) * 100)}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2.5">
        {(open ? items : outstanding.slice(0, 3)).map((item) => (
          <li key={item.label}>
            <Link
              to={item.to}
              params={{ slug }}
              className="flex items-start gap-3 rounded-lg px-1 py-1 hover:bg-muted/60"
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                  item.done ? "bg-emerald-600" : "bg-destructive"
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

      {(outstanding.length > 3 || open) && (
        <button
          className="mt-3 text-sm font-medium text-primary hover:underline"
          onClick={() => setOpen(!open)}
        >
          {open ? "Show less" : `Show all ${total}`}
        </button>
      )}
    </div>
  );
}
