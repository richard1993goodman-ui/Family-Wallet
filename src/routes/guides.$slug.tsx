import { createFileRoute, notFound } from "@tanstack/react-router";

import { MarketingPage } from "@/components/MarketingPage";
import { contentHead } from "@/lib/landing-head";
import { GUIDES } from "@/lib/landing-content";

const crumbsFor = (name: string, path: string) => [
  { name: "Home", path: "/" },
  { name: "Guides", path: "/guides" },
  { name, path },
];

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = GUIDES[params.slug];
    if (!guide) throw notFound();
    return guide;
  },
  head: ({ loaderData }) => (loaderData ? contentHead(loaderData, crumbsFor(loaderData.h1, loaderData.path)) : {}),
  component: GuidePage,
});

function GuidePage() {
  const guide = Route.useLoaderData();
  return <MarketingPage content={guide} crumbs={crumbsFor(guide.h1, guide.path)} />;
}
