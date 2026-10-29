import { createFileRoute, redirect } from "@tanstack/react-router";

// Cover requests were an agency service and have been removed from the wallet.
export const Route = createFileRoute("/cover/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/w/$slug", params: { slug: params.slug } });
  },
});
