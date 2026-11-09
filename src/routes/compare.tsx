import { createFileRoute } from "@tanstack/react-router";

import { MarketingPage } from "@/components/MarketingPage";
import { contentHead } from "@/lib/landing-head";
import { LANDING } from "@/lib/landing-content";

const content = LANDING.compare;
const crumbs = [
  { name: "Home", path: "/" },
  { name: "Compared", path: content.path },
];

export const Route = createFileRoute("/compare")({
  head: () => contentHead(content, crumbs),
  component: () => <MarketingPage content={content} crumbs={crumbs} />,
});
