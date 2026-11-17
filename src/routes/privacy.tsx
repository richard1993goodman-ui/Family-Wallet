import { createFileRoute } from "@tanstack/react-router";

import { MarketingLayout, frame } from "@/components/MarketingLayout";
import { pageHead } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () =>
    pageHead({
      title: "Privacy policy | Family Wallet",
      description:
        "How Family Wallet collects, uses, shares and keeps personal information, including children's care records, staff details and the Family Assistant.",
      path: "/privacy",
    }),
  component: PrivacyPage,
});

const h2 = "heading-serif mt-12 text-[1.5rem] leading-tight text-foreground sm:text-[1.75rem]";
const p = "mt-4 text-[1.0625rem] leading-7 text-muted-foreground";
const li = "ml-5 list-disc";
const strong = "font-semibold text-foreground";
const link = "text-foreground underline underline-offset-4";

function PrivacyPage() {
  return (
    <MarketingLayout>
      <main className={`${frame} max-w-3xl py-16 sm:py-20`}>
        <h1 className="heading-serif text-[2.5rem] leading-[1.05] text-foreground sm:text-[3.25rem]">
          Privacy policy
        </h1>
        <p className={p}>Last updated: 17 November 2026</p>

        <h2 className={h2}>1. Who we are</h2>
        <p className={p}>
          Family Wallet is provided by Richard Goodman, a sole trader trading as Family Wallet, 41
          Merry Hill Mount, Bushey, WD23 1JD. You can contact us at{" "}
          <a className={link} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p className={p}>
          This policy explains what personal data Family Wallet collects, why, who we share it with,
          and the choices you have. It applies to the Family Wallet app and to familywallet.io.
        </p>

        <h2 className={h2}>2. What the app is for</h2>
        <p className={p}>
          Family Wallet is a shared place for a family and the people who help care for their
          children: parents, nannies and other staff. It holds the children’s routines, calendar,
          medicine records, emergency details, staff timesheets, expenses, documents and messages,
          so everyone involved sees the same information.
        </p>

        <h2 className={h2}>3. Information we collect</h2>
        <p className={p}>
          <strong className={strong}>Account details:</strong> your name, email address, and any
          profile photo you add. If you sign in with Apple or Google, we receive the email address
          and name that you choose to share with us.
        </p>
        <p className={p}>
          <strong className={strong}>Household details:</strong> the family name, the home’s codes
          and access notes if you choose to save them, and the people linked to the household and
          their roles.
        </p>
        <p className={p}>
          <strong className={strong}>Children’s information:</strong> each child’s name, date of
          birth, school, routines, allergies, dietary needs, medication, and any notes you add. This
          is information about children and about health, and we treat it with the highest level of
          care.
        </p>
        <p className={p}>
          <strong className={strong}>Care records:</strong> naps, meals, nappies, bottles, medicine
          doses given (with who gave them and when), incident reports, notes, activities and photos.
        </p>
        <p className={p}>
          <strong className={strong}>Staff information:</strong> staff profiles, emergency contacts,
          documents such as insurance and certificates with expiry dates, timesheets, working hours,
          leave and agreements.
        </p>
        <p className={p}>
          <strong className={strong}>Money:</strong> expense claims and receipts, petty cash
          entries, and bank details used to pay staff or reimburse expenses. We do not store card
          numbers.
        </p>
        <p className={p}>
          <strong className={strong}>Messages and photos:</strong> messages between household
          members and the photos you share.
        </p>
        <p className={p}>
          <strong className={strong}>Device information:</strong> your notification settings and a
          notification token for the phone, so we can send alerts you have turned on. We do not use
          third-party analytics or crash-reporting tools.
        </p>
        <p className={p}>
          <strong className={strong}>Family Assistant:</strong> when you use the assistant, the
          messages you type or say, and the household information the assistant reads to answer you,
          are sent to our server and then to an AI provider. See section 6.
        </p>
        <p className={p}>
          <strong className={strong}>Subscriptions:</strong> whether your household has an active
          subscription. Payments are handled by Apple, and by Google once the Android app is
          available. We use RevenueCat to check subscriptions. RevenueCat receives an internal ID
          linked to your account and the purchase details from the app store.
        </p>

        <h2 className={h2}>4. How we use information</h2>
        <ul className="mt-4 space-y-2 text-[1.0625rem] leading-7 text-muted-foreground">
          <li className={li}>
            To provide the app: sign-in, the shared household view, care records, calendar, messages
            and reminders.
          </li>
          <li className={li}>
            To send notifications you have chosen to receive, and to keep quiet hours.
          </li>
          <li className={li}>To keep your information secure, prevent misuse and fix faults.</li>
          <li className={li}>
            To meet legal obligations, for example keeping records that the law requires.
          </li>
          <li className={li}>To answer your questions when you contact us.</li>
        </ul>
        <p className={p}>
          We do not sell your personal information, and we do not use children’s information for
          advertising.
        </p>

        <h2 className={h2}>5. Our legal basis (UK GDPR)</h2>
        <ul className="mt-4 space-y-2 text-[1.0625rem] leading-7 text-muted-foreground">
          <li className={li}>
            <strong className={strong}>Contract:</strong> to provide the service you signed up for.
          </li>
          <li className={li}>
            <strong className={strong}>Legitimate interests:</strong> keeping the service secure and
            working properly, weighed against your rights.
          </li>
          <li className={li}>
            <strong className={strong}>Consent:</strong> for optional features such as voice input,
            notifications and photos, which you can turn off at any time.
          </li>
          <li className={li}>
            <strong className={strong}>Health information (special category data):</strong> we rely
            on your explicit consent, given when you save this information, and on the need to
            protect a child’s vital interests in an emergency.
          </li>
        </ul>

        <h2 className={h2}>6. The Family Assistant and voice input</h2>
        <p className={p}>
          <strong className={strong}>AI provider.</strong> The Family Assistant uses Claude, a
          service from Anthropic. When you ask it something, your message and the household
          information it needs are sent to Anthropic to produce a reply. Anthropic keeps these
          inputs and outputs for up to 30 days, and we have not joined any programme that shares
          data with Anthropic for model training. Anthropic may keep content for longer if it is
          flagged under its safety rules. The assistant cannot save anything on its own: you confirm
          each action before it is saved.
        </p>
        <p className={p}>
          <strong className={strong}>Voice input.</strong> If you use the microphone, what you say
          is turned into text by your phone’s speech service. On iPhone the app asks for recognition
          on the device wherever the phone supports it, so your speech stays on your phone. On
          Android it uses Google’s speech service. We receive the text, not the audio.
        </p>
        <p className={p}>
          <strong className={strong}>Limits.</strong> You can stop either feature at any time in the
          app or in your phone’s settings.
        </p>

        <h2 className={h2}>7. Who we share information with</h2>
        <p className={p}>
          We share information only with the service providers that run Family Wallet on our behalf,
          and only as far as they need it.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-[0.9375rem] leading-6">
            <thead>
              <tr className="border-b border-border text-foreground">
                <th className="py-2 pr-4 font-semibold">Provider</th>
                <th className="py-2 pr-4 font-semibold">Purpose</th>
                <th className="py-2 font-semibold">Where data is processed</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/70">
                <td className="py-2 pr-4">Supabase</td>
                <td className="py-2 pr-4">Database, sign-in, file storage</td>
                <td className="py-2">London, UK (AWS eu-west-2)</td>
              </tr>
              <tr className="border-b border-border/70">
                <td className="py-2 pr-4">Anthropic</td>
                <td className="py-2 pr-4">Family Assistant replies</td>
                <td className="py-2">
                  Stored in the United States; requests may be processed in other countries
                </td>
              </tr>
              <tr className="border-b border-border/70">
                <td className="py-2 pr-4">Resend</td>
                <td className="py-2 pr-4">
                  Sending emails such as sign-in codes and support replies
                </td>
                <td className="py-2">Ireland, EU (eu-west-1)</td>
              </tr>
              <tr className="border-b border-border/70">
                <td className="py-2 pr-4">Apple and Google</td>
                <td className="py-2 pr-4">Sign-in, notifications, subscriptions, speech input</td>
                <td className="py-2">Worldwide</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">RevenueCat</td>
                <td className="py-2 pr-4">Checking subscriptions and purchases</td>
                <td className="py-2">As set out in RevenueCat’s own privacy policy</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={p}>
          Members of your household see what the household shares, as the app’s permissions allow.
          We never share your information for advertising.
        </p>
        <p className={p}>We may disclose information if the law requires it.</p>

        <h2 className={h2}>8. International transfers</h2>
        <p className={p}>
          Some providers process information outside the UK, including in the United States. Where
          this happens, we rely on the transfer safeguards those providers offer under UK data
          protection law, and we will tell you if that changes.
        </p>

        <h2 className={h2}>9. How long we keep information</h2>
        <ul className="mt-4 space-y-2 text-[1.0625rem] leading-7 text-muted-foreground">
          <li className={li}>
            Account and household details: until you delete the household or account.
          </li>
          <li className={li}>
            Care records, medicine records and incident reports: until the child turns 21.
          </li>
          <li className={li}>
            Staff timesheets, expenses and payroll-related records: six years after the end of the
            tax year they relate to.
          </li>
          <li className={li}>Messages and photos: until deleted by the household.</li>
          <li className={li}>Support emails: 2 years.</li>
          <li className={li}>
            Email delivery logs held by our email provider (Resend): 30 days, as Resend’s published
            period for its standard plans.
          </li>
        </ul>
        <p className={p}>
          When you delete something in the app it is removed, subject to the periods above and to
          records we must keep by law.
        </p>

        <h2 className={h2}>10. Security</h2>
        <p className={p}>
          Information is encrypted in transit. Sign-in sessions are kept in your phone’s secure
          storage. Access to each household is controlled by database rules, so one household cannot
          see another’s information. No system is perfectly secure, so please keep your phone locked
          and do not share sign-in codes.
        </p>

        <h2 className={h2}>11. Children</h2>
        <p className={p}>
          Family Wallet is for parents, guardians and the staff they invite. It is not designed for
          children to use directly. We do not knowingly collect personal information from children
          directly.
        </p>

        <h2 className={h2}>12. Your rights</h2>
        <p className={p}>Under UK data protection law you can ask us to:</p>
        <ul className="mt-4 space-y-2 text-[1.0625rem] leading-7 text-muted-foreground">
          <li className={li}>
            give you a copy of your information (the app has a “Download your data” option);
          </li>
          <li className={li}>correct information that is wrong;</li>
          <li className={li}>delete information, subject to records we must keep;</li>
          <li className={li}>restrict or object to some uses;</li>
          <li className={li}>withdraw consent for optional features at any time.</li>
        </ul>
        <p className={p}>
          To use these rights, email{" "}
          <a className={link} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          . We will reply within one month. You can also complain to the Information Commissioner’s
          Office (ico.org.uk).
        </p>

        <h2 className={h2}>13. Changes</h2>
        <p className={p}>
          We will tell you in the app or by email if we change this policy in a way that matters to
          you.
        </p>

        <h2 className={h2}>14. Contact</h2>
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
