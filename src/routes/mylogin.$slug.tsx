import { createFileRoute } from "@tanstack/react-router";

import { CreateLogin } from "@/components/CreateLogin";
import { LanguagePicker } from "@/components/LanguagePicker";
import { HubPage } from "@/components/hub-ui";

export const Route = createFileRoute("/mylogin/$slug")({
  head: () => ({
    meta: [{ title: "My login | Family Wallet" }, { name: "robots", content: "noindex" }],
  }),
  component: MyLoginPage,
});

/** Parents and staff create their own email login here. Hidden from the menu until accounts are switched on. */
function MyLoginPage() {
  const { slug } = Route.useParams();
  return (
    <HubPage
      slug={slug}
      title="My login"
      intro="Sign in with your own email on any device. Optional: your access code keeps working."
    >
      <CreateLogin slug={slug} />
      <LanguagePicker />
    </HubPage>
  );
}
