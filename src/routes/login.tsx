import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, ChevronRight, ShieldCheck } from "lucide-react";
import { HouseMark } from "@/components/brand";
import { FamilyLogin } from "@/components/FamilyLogin";
import { RecoverDetails } from "@/components/RecoverDetails";
import { onMailtoClick } from "@/lib/mailto";
import { CONTACT_EMAIL } from "@/lib/site";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Open your wallet — Family Wallet" },
      {
        name: "description",
        content: "Enter your wallet link and access code to open your Family Wallet.",
      },
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
            className="web-only inline-flex items-center gap-2 text-[0.9375rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16 sm:px-0">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex items-center gap-2.5">
              <HouseMark className="h-9 w-9" />
              <p className="text-[1.0625rem] font-semibold text-foreground">Family Wallet</p>
            </div>
            <h1 className="heading-serif mt-6 text-[2.25rem] leading-[1.08] text-foreground">
              Your household.
              <br />
              All in one place.
            </h1>
            <p className="mt-3 max-w-[22rem] text-[0.9375rem] leading-relaxed text-muted-foreground">
              Childcare, schedules, people and important details, in one private wallet.
            </p>
          </div>
          {/* Phones get the photo inline; desktop already shows it in the left column. */}
          <figure className="relative mb-6 overflow-hidden rounded-[1.75rem] shadow-md lg:hidden">
            <img
              src="/images/kids/school-run.jpg"
              alt="A nanny walking children home from school"
              width={1400}
              height={1093}
              className="aspect-[16/11] w-full object-cover"
            />
            <figcaption className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[0.8125rem] font-medium text-foreground backdrop-blur">
              <ShieldCheck className="size-4 text-positive" aria-hidden /> Private to your household
            </figcaption>
          </figure>
          <FamilyLogin
            showAgencyTab
            className="border-transparent shadow-sm"
            footer={
              <p className="text-center text-[0.8125rem] text-muted-foreground">
                Lost your details? Your agency can resend them, or email us at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  onClick={onMailtoClick}
                  className="underline underline-offset-4"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            }
          />
          <Link
            to="/join"
            className="mt-4 flex items-center gap-3.5 rounded-[1.25rem] border border-border bg-card p-4 shadow-sm transition-colors hover:bg-raised"
          >
            <span className="grid size-11 flex-none place-items-center rounded-full bg-brand-soft text-brand">
              <Building2 className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-semibold text-foreground">
                Invited by a partner agency?
              </span>
              <span className="block text-[0.8125rem] text-muted-foreground">
                Enter your agency invitation code
              </span>
            </span>
            <ChevronRight className="size-5 flex-none text-muted-foreground" aria-hidden />
          </Link>
          <RecoverDetails />
        </main>
      </div>
    </div>
  );
}
