import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { openDemoWallet } from "@/lib/wallet.functions";
import { setDemoBrand } from "@/lib/demo-brand";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/demo")({
  head: () =>
    pageHead({
      title: "Demo The Family Wallet",
      description: "Explore a sample Family Wallet: agreement, planner, daily logs, sports passport and more.",
      path: "/demo",
      noindex: true,
    }),
  component: DemoEntry,
});

function DemoEntry() {
  const navigate = useNavigate();
  const open = useServerFn(openDemoWallet);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    open()
      .then((r) => (r.ok ? (setDemoBrand(null), navigate({ to: "/w/$slug", params: { slug: "demo" }, replace: true })) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [open, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-6 text-center">
      <p className="text-muted-foreground">
        {failed ? "The demo wallet isn't available right now. Please try again shortly." : "Opening the demo Family Wallet…"}
      </p>
    </div>
  );
}
