import { createFileRoute } from "@tanstack/react-router";

import { MarketingPage } from "@/components/MarketingPage";
import { contentHead } from "@/lib/landing-head";
import { LANDING } from "@/lib/landing-content";

const content = LANDING.staff;
const crumbs = [
  { name: "Home", path: "/" },
  { name: "Household staff app", path: content.path },
];

export const Route = createFileRoute("/household-staff-app")({
  head: () => contentHead(content, crumbs),
  component: () => <MarketingPage content={content} crumbs={crumbs} />,
});
