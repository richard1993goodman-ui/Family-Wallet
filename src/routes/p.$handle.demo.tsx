import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { openDemoWallet } from "@/lib/wallet.functions";
import { getPartnerBrand } from "@/lib/partner-brand.functions";
import { setDemoBrand } from "@/lib/demo-brand";

export const Route = createFileRoute("/p/$handle/demo")({
  loader: ({ params }) => getPartnerBrand({ data: { handle: params.handle } }),
  head: ({ loaderData }) => {
    const title = loaderData ? `Demo ${loaderData.walletName}` : "Demo Family Wallet";
    const description = loaderData
      ? `See a sample ${loaderData.walletName}: planner, agreement, emergency card and more.`
      : "See a sample Family Wallet.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: PartnerDemo,
});

function PartnerDemo() {
  const brand = Route.useLoaderData();
  const navigate = useNavigate();
  const open = useServerFn(openDemoWallet);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!brand) { setFailed(true); return; }
    open()
      .then((r) => {
        if (!r.ok) return setFailed(true);
        setDemoBrand(brand.walletName);
        navigate({ to: "/w/$slug", params: { slug: "demo" }, replace: true });
      })
      .catch(() => setFailed(true));
  }, [brand, open, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-6 text-center">
      <p className="text-muted-foreground">{failed ? "This demo isn't available right now." : `Opening the demo ${brand?.walletName ?? "Family Wallet"}…`}</p>
    </div>
  );
}
