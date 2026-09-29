import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { openDemoWallet } from "@/lib/wallet.functions";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo Family Vault — Athlete Mannies & Nannies" },
      { name: "description", content: "Explore a sample Athlete Mannies Family Vault: agreement, planner, daily logs, sports passport and more." },
      { property: "og:title", content: "Demo Family Vault — Athlete Mannies & Nannies" },
      { property: "og:description", content: "See what a private Athlete Mannies Family Vault looks like for members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoEntry,
});

function DemoEntry() {
  const navigate = useNavigate();
  const open = useServerFn(openDemoWallet);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    open()
      .then((r) => (r.ok ? navigate({ to: "/w/$slug", params: { slug: "demo" }, replace: true }) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [open, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-6 text-center">
      <p className="text-muted-foreground">
        {failed ? "The demo vault isn't available right now. Please try again shortly." : "Opening the demo Family Vault…"}
      </p>
    </div>
  );
}
