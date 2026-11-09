import { createFileRoute } from "@tanstack/react-router";

import { MarketingPage } from "@/components/MarketingPage";
import { contentHead } from "@/lib/landing-head";
import { LANDING } from "@/lib/landing-content";

const content = LANDING.agencies;
const crumbs = [
  { name: "Home", path: "/" },
  { name: "For agencies", path: content.path },
];

export const Route = createFileRoute("/for-agencies")({
  head: () => contentHead(content, crumbs),
  component: () => <MarketingPage content={content} crumbs={crumbs} />,
});
