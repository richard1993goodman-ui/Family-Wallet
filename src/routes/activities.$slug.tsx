import { createFileRoute } from "@tanstack/react-router";
import { ResourceHub } from "@/components/ResourceHub";

export const Route = createFileRoute("/activities/$slug")({
  head: () => ({ meta: [
    { title: "Nanny Activity Guide — Family Wallet" },
    { name: "description", content: "Create, save and plan activities in your private Family Wallet." },
    { property: "og:title", content: "Nanny Activity Guide — Family Wallet" },
    { property: "og:description", content: "Create, save and plan family activities." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: () => <ResourceHub slug={Route.useParams().slug} kind="activity" />,
});
