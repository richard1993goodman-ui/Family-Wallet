import { createFileRoute } from "@tanstack/react-router";
import { ResourceHub } from "@/components/ResourceHub";

export const Route = createFileRoute("/fuel/$slug")({
  head: () => ({ meta: [
    { title: "Nanny Fuel — Family Wallet" },
    { name: "description", content: "Create, save and plan family meals in your private wallet." },
    { property: "og:title", content: "Nanny Fuel — Family Wallet" },
    { property: "og:description", content: "Create, save and plan family meals." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: () => <ResourceHub slug={Route.useParams().slug} kind="meal" />,
});
