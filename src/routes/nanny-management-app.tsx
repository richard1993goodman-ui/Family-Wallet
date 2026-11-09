import { createFileRoute } from "@tanstack/react-router";

import { MarketingPage } from "@/components/MarketingPage";
import { contentHead } from "@/lib/landing-head";
import { LANDING } from "@/lib/landing-content";

const content = LANDING.nanny;
const crumbs = [
  { name: "Home", path: "/" },
  { name: "Nanny management app", path: content.path },
];

export const Route = createFileRoute("/nanny-management-app")({
  head: () => contentHead(content, crumbs),
  component: () => <MarketingPage content={content} crumbs={crumbs} />,
});
