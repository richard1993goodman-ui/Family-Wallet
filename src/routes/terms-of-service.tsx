import { createFileRoute } from "@tanstack/react-router";

import { MarketingLayout, frame } from "@/components/MarketingLayout";
import { pageHead } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/site";

export const Route = createFileRoute("/terms-of-service")({
  head: () =>
    pageHead({
      title: "Terms of service | Family Wallet",
      description:
        "The terms for using Family Wallet: accounts, households, subscriptions, your content, the Family Assistant and what we are responsible for.",
      path: "/terms-of-service",
    }),
  component: TermsOfServicePage,
});

const h2 = "heading-serif mt-12 text-[1.5rem] leading-tight text-foreground sm:text-[1.75rem]";
const p = "mt-4 text-[1.0625rem] leading-7 text-muted-foreground";
const li = "ml-5 list-disc";
const strong = "font-semibold text-foreground";
const link = "text-foreground underline underline-offset-4";

function TermsOfServicePage() {
  return (
    <MarketingLayout>
      <main className={`${frame} max-w-3xl py-16 sm:py-20`}>
        <h1 className="heading-serif text-[2.5rem] leading-[1.05] text-foreground sm:text-[3.25rem]">
          Terms of service
        </h1>
        <p className={p}>Last updated: 17 November 2026</p>

        <h2 className={h2}>1. About these terms</h2>
        <p className={p}>
          These terms apply to your use of the Family Wallet app and the familywallet.io website.
          Family Wallet is provided by Richard Goodman, a sole trader trading as Family Wallet, 41
          Merry Hill Mount, Bushey, WD23 1JD. You can contact us at{" "}
          <a className={link} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          . By creating an account or using the app, you agree to these terms. Our privacy policy
          explains how we handle personal information and forms part of these terms.
        </p>

        <h2 className={h2}>2. Who can use Family Wallet</h2>
        <p className={p}>
          You must be 18 or over to create an account. Parents and guardians set up a household.
          Nannies, au pairs and other staff join a household only when a household member invites
          them. Anyone who adds information about a child or a member of staff must have the right
          to do so.
        </p>

        <h2 className={h2}>3. Your account</h2>
        <p className={p}>
          You sign in with an email code, Apple or Google. Keep your sign-in private and do not
          share codes. Tell us straight away at{" "}
          <a className={link} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          if you think someone else has access to your account. You are responsible for activity
          under your account.
        </p>

        <h2 className={h2}>4. Households and roles</h2>
        <p className={p}>
          The household is the shared space for a family. Parents control what staff can see and do,
          using the permissions in the app. Household members are responsible for the information
          they add, and for keeping it accurate. Staff see only what the household has shared with
          them.
        </p>

        <h2 className={h2}>5. Subscriptions and payments</h2>
        <p className={p}>
          A household needs a subscription to use Family Wallet, and the price is shown in the app
          before you buy. Subscriptions are bought through the Apple App Store, and through Google
          Play once the Android app is available. The subscription renews automatically until you
          cancel. You can cancel at any time in your App Store or Google Play account settings, and
          the cancellation takes effect at the end of the current paid period.
        </p>
        <p className={p}>
          Refunds for App Store or Google Play purchases are handled by Apple or Google under their
          own rules. Staff invited to a household do not need a subscription of their own.
        </p>
        <p className={p}>
          If a subscription ends, the household keeps access for a grace period shown in the app so
          it can download its information. After that the wallet locks until a subscription starts
          again.
        </p>

        <h2 className={h2}>6. Your content</h2>
        <p className={p}>
          You keep ownership of the information you add. You give us permission to store and show it
          to the people in your household, and to process it as needed to run the app. You must not
          add anything unlawful, offensive, or that infringes someone else’s rights. Before you add
          information about a member of staff or a child, you must have their permission or the
          authority to do so.
        </p>

        <h2 className={h2}>7. The Family Assistant</h2>
        <p className={p}>
          The Family Assistant uses artificial intelligence and can make mistakes. Check anything
          important before you rely on it. The assistant cannot save anything on its own: you must
          confirm each action before it is saved. Nothing the assistant says is medical, legal or
          financial advice.
        </p>

        <h2 className={h2}>8. Health and emergencies</h2>
        <p className={p}>
          Family Wallet keeps records and helps a household coordinate care. It is not a substitute
          for medical advice, diagnosis or treatment, and it is not an emergency service. In an
          emergency, call 999 (or 112).
        </p>

        <h2 className={h2}>9. Acceptable use</h2>
        <p className={p}>You must not:</p>
        <ul className="mt-4 space-y-2 text-[1.0625rem] leading-7 text-muted-foreground">
          <li className={li}>
            try to access another household’s information or any part of the service you are not
            allowed to use;
          </li>
          <li className={li}>
            copy, scrape, reverse engineer or interfere with the app or the website;
          </li>
          <li className={li}>use the app to break the law or to harm, harass or mislead anyone;</li>
          <li className={li}>share your sign-in with someone who is not part of your household.</li>
        </ul>

        <h2 className={h2}>10. Availability and changes</h2>
        <p className={p}>
          We work to keep Family Wallet available, but we do not promise it will always be
          uninterrupted or error-free. We may update, change or remove features, and we will tell
          you in the app when a change matters to you. If we change the price of a subscription, we
          will tell you in advance and the change will not take effect until your next renewal.
        </p>

        <h2 className={h2}>11. Ending your use</h2>
        <p className={p}>
          You can stop using Family Wallet at any time, and you can delete your account in the app.
          We may suspend or end an account that breaks these terms, or that puts the service or
          other users at risk.
        </p>

        <h2 className={h2}>12. Our responsibility</h2>
        <p className={p}>
          Nothing in these terms limits our liability for death or personal injury caused by
          negligence, for fraud, or for anything else that the law does not allow us to limit. Your
          statutory rights as a consumer are not affected.
        </p>
        <p className={p}>
          Subject to that, we are not liable for indirect or consequential losses, or for loss of
          profit or data that you could reasonably have prevented by keeping your own copies. Our
          total liability to you for any claim is limited to the subscription fees you paid in the
          12 months before the claim.
        </p>

        <h2 className={h2}>13. Privacy</h2>
        <p className={p}>
          Our{" "}
          <a className={link} href="/privacy">
            privacy policy
          </a>{" "}
          explains how we collect, use, share and keep personal information.
        </p>

        <h2 className={h2}>14. Governing law</h2>
        <p className={p}>
          These terms are governed by the law of England and Wales. The courts of England and Wales
          have jurisdiction, although you may also bring a claim in the courts of your home country
          if the law gives you that right.
        </p>

        <h2 className={h2}>15. Contact</h2>
        <p className={p}>
          Richard Goodman, trading as Family Wallet
          <br />
          <a className={link} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          <br />
          41 Merry Hill Mount, Bushey, WD23 1JD
        </p>
      </main>
    </MarketingLayout>
  );
}
