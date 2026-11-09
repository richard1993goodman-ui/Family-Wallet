import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FamilyLogin } from "@/components/FamilyLogin";
import { RecoverDetails } from "@/components/RecoverDetails";
import { CONTACT_EMAIL } from "@/lib/site";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Open your wallet — The Family Wallet" },
      { name: "description", content: "Enter your wallet link and access code to open your Family Wallet." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <figure className="relative hidden lg:block">
        <img
          src="/images/kids/painted.jpg"
          alt="A smiling toddler with a yellow hair bow, covered in bright paint, looking up"
          width={1040}
          height={1300}
          className="absolute inset-0 h-full w-full object-cover object-[40%_30%]"
        />
      </figure>
      <div className="flex flex-col">
        <header className="flex h-16 items-center px-4 sm:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[0.9375rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16 sm:px-0">
          <p className="heading-serif mb-8 text-center text-[1.75rem] leading-none text-foreground">
            The Family Wallet
          </p>
          <FamilyLogin
            showAgencyTab
            className="border-transparent shadow-sm"
            footer={
              <p className="text-center text-[0.8125rem] text-muted-foreground">
                Lost your details? Your agency can resend them, or email us at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            }
          />
          <RecoverDetails />
        </main>
      </div>
    </div>
  );
}
