import { formatDate } from "@/lib/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildExportFn, exportFileLinkFn, getExportStatusFn } from "@/lib/export.functions";
import { unlockWallet } from "@/lib/wallet.functions";

export const Route = createFileRoute("/export/$slug")({
  head: () => ({ meta: [{ title: "Download your data" }, { name: "robots", content: "noindex" }] }),
  component: ExportPage,
});

type Files = { table: string; field: string; path: string }[];

function ExportPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const statusFn = useServerFn(getExportStatusFn);
  const unlockFn = useServerFn(unlockWallet);
  const buildFn = useServerFn(buildExportFn);
  const linkFn = useServerFn(exportFileLinkFn);
  const status = useQuery({
    queryKey: ["export-status", slug],
    queryFn: () => statusFn({ data: { slug } }),
  });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<Files>([]);

  const open = async () => {
    setBusy(true);
    try {
      const result = await unlockFn({ data: { slug, code } });
      if (!result.ok)
        throw new Error(
          result.reason === "rate_limited"
            ? "Too many tries. Wait a few minutes."
            : "That code doesn't match.",
        );
      await client.invalidateQueries({ queryKey: ["export-status", slug] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't check that code.");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      const out = await buildFn({ data: { slug } });
      if (!out) throw new Error("Couldn't prepare your data. Enter your code again.");
      const url = URL.createObjectURL(new Blob([out.json], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = out.fileName;
      a.click();
      URL.revokeObjectURL(url);
      setFiles(out.files);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't prepare your data.");
    } finally {
      setBusy(false);
    }
  };

  const openFile = async (path: string) => {
    const url = await linkFn({ data: { slug, path } });
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Couldn't open that file.");
  };

  const data = status.data;
  const on = data?.deleteAfter
    ? formatDate(data.deleteAfter, { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-10">
      <h1 className="heading-display text-3xl text-foreground">Download your data</h1>
      {status.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : !data ? (
        <div className="mt-4 rounded-2xl bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Enter your wallet's 6-character access code to download a copy of your data.
          </p>
          <Input
            className="mt-3 h-12 text-center font-mono text-xl tracking-[0.3em]"
            maxLength={6}
            value={code}
            placeholder="ACCESS CODE"
            autoCapitalize="characters"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button className="mt-3 w-full" disabled={busy || code.length < 6} onClick={open}>
            Continue
          </Button>
        </div>
      ) : (
        <>
          {data.locked && (
            <p className="mt-3 rounded-xl bg-muted p-4 text-sm text-foreground">
              This wallet is locked.{on ? ` Your data is permanently deleted on ${on}` : ""}
              {data.daysLeft != null ? ` (${data.daysLeft} days left)` : ""}. Download it before
              then.
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            One file with everything in the {data.familyName} wallet: profile, logs, schedules,
            agreements and messages. Access codes are never included. Photos and documents download
            separately below.
          </p>
          <Button className="mt-5 w-full" disabled={busy} onClick={download}>
            {busy ? "Preparing…" : "Download my data"}
          </Button>
          {files.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-foreground">Files ({files.length})</h2>
              <ul className="mt-2 divide-y divide-border rounded-2xl bg-card shadow-sm">
                {files.map((f) => (
                  <li
                    key={f.path}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                  >
                    <span className="truncate text-muted-foreground">
                      {f.path.split("/").pop()}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => openFile(f.path)}>
                      Download
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!data.locked && (
            <Button asChild variant="ghost" className="mt-6">
              <Link to="/w/$slug" params={{ slug }}>
                Back to my wallet
              </Link>
            </Button>
          )}
        </>
      )}
    </main>
  );
}
