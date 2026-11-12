import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { toast } from "sonner";

import { Field, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  addFamilyContactFn,
  getEmergencyCard,
  saveChildFn,
  saveEmergencyProfileFn,
} from "@/lib/family.functions";
import { saveNannyFn } from "@/lib/nannies.functions";
import { STAFF_ROLES } from "@/lib/staff-roles";

export const Route = createFileRoute("/start/$slug")({
  head: () => ({
    meta: [{ title: "Set up your Family Wallet" }, { name: "robots", content: "noindex" }],
  }),
  component: StartPage,
});

const STEPS = [
  {
    title: "Your home",
    why: "So your nanny or au pair can find their way, and anyone helping in an emergency knows where you are. Only your household can see this.",
  },
  {
    title: "In an emergency",
    why: "Who to call first, and what to do. Shown on the Emergency button, to you and the staff you add. Nobody else sees it.",
  },
  {
    title: "Your children",
    why: "Allergies and care needs are the most important thing a carer has to know. Add only what is useful; you can change it any time.",
  },
  {
    title: "Your household staff",
    why: "Add the people who work for you. They get their own private way in later; you control what they see and can remove access at any time.",
  },
] as const;

function StartPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const load = useServerFn(getEmergencyCard);
  const query = useQuery({ queryKey: ["start", slug], queryFn: () => load({ data: { slug } }) });
  const [step, setStep] = useState<number | null>(null);

  const data = query.data;
  // Resume where they left off: the first step that still has nothing in it.
  useEffect(() => {
    if (!data || step !== null) return;
    const done = [
      !!data.profile?.home_address,
      data.contacts.length > 0,
      data.children.length > 0,
      data.nannies.length > 0,
    ];
    const first = done.findIndex((d) => !d);
    setStep(first === -1 ? 4 : first);
  }, [data, step]);

  if (query.isLoading || (data && step === null)) return <PageLoading />;
  if (!data || data.access !== "family") return <LockedNotice slug={slug} />;
  const current = step ?? 0;
  const refresh = () => client.invalidateQueries({ queryKey: ["start", slug] });

  if (current >= STEPS.length)
    return <AllSet slug={slug} onBack={() => setStep(STEPS.length - 1)} />;

  const next = () => setStep(current + 1);
  const spec = STEPS[current]!;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 pb-16 pt-8">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Step {current + 1} of {STEPS.length}
        </span>
        <Link to="/w/$slug" params={{ slug }} className="underline-offset-4 hover:underline">
          Finish later
        </Link>
      </div>
      <Progress value={((current + 1) / STEPS.length) * 100} className="mt-3 h-1.5" />

      <h1 className="heading-serif mt-8 text-[1.75rem] leading-tight text-foreground">
        {spec.title}
      </h1>
      <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
        {spec.why}
      </p>

      <div className="mt-6 flex-1">
        {current === 0 && <HomeStep slug={slug} data={data} onSaved={refresh} onNext={next} />}
        {current === 1 && <EmergencyStep slug={slug} data={data} onSaved={refresh} onNext={next} />}
        {current === 2 && <ChildrenStep slug={slug} data={data} onSaved={refresh} onNext={next} />}
        {current === 3 && <StaffStep slug={slug} data={data} onSaved={refresh} onNext={next} />}
      </div>

      {current > 0 && (
        <Button variant="ghost" className="mt-6 self-start" onClick={() => setStep(current - 1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      )}
    </main>
  );
}

type Data = NonNullable<Awaited<ReturnType<typeof getEmergencyCard>>>;
type StepProps = { slug: string; data: Data; onSaved: () => unknown; onNext: () => void };

/** Save-and-continue plus a plain "Skip for now": nothing here is a hard blocker. */
function Actions({
  busy,
  onSave,
  canSave = true,
  onSkip,
}: {
  busy: boolean;
  onSave: () => void;
  canSave?: boolean;
  onSkip: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-2">
      <Button
        size="lg"
        className="h-12 w-full text-base"
        disabled={busy || !canSave}
        onClick={onSave}
      >
        Save and continue
      </Button>
      <Button variant="ghost" className="h-11 w-full" onClick={onSkip}>
        Skip for now
      </Button>
    </div>
  );
}

function useSaving() {
  const [busy, setBusy] = useState(false);
  const run = async (job: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await job();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

/** The emergency profile has four fields in one record; always send all four so saving one step never blanks the other. */
function profileOf(data: Data) {
  const p = data.profile;
  return {
    homeAddress: p?.home_address ?? "",
    gpDetails: p?.gp_details ?? "",
    medicalNotes: p?.medical_notes ?? "",
    emergencyInstructions: p?.emergency_instructions ?? "",
  };
}

function HomeStep({ slug, data, onSaved, onNext }: StepProps) {
  const save = useServerFn(saveEmergencyProfileFn);
  const start = profileOf(data);
  const [address, setAddress] = useState(start.homeAddress);
  const [gp, setGp] = useState(start.gpDetails);
  const { busy, run } = useSaving();
  return (
    <>
      <div className="space-y-4">
        <Field
          label="Home address"
          value={address}
          onChange={setAddress}
          textarea
          placeholder="House number, street, postcode"
        />
        <Field
          label="Your GP or doctor (optional)"
          value={gp}
          onChange={setGp}
          textarea
          placeholder="Surgery name and phone number"
        />
      </div>
      <Actions
        busy={busy}
        onSkip={onNext}
        onSave={async () => {
          if (
            await run(() => save({ data: { slug, ...start, homeAddress: address, gpDetails: gp } }))
          ) {
            await onSaved();
            onNext();
          }
        }}
      />
    </>
  );
}

function EmergencyStep({ slug, data, onSaved, onNext }: StepProps) {
  const addContact = useServerFn(addFamilyContactFn);
  const saveProfile = useServerFn(saveEmergencyProfileFn);
  const start = profileOf(data);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [instructions, setInstructions] = useState(start.emergencyInstructions);
  const { busy, run } = useSaving();
  const adding = !!(name.trim() || phone.trim());
  const addIsComplete = !!(name.trim() && phone.trim());
  return (
    <>
      {data.contacts.length > 0 && (
        <ul className="mb-5 space-y-2">
          {data.contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-lg bg-card px-4 py-3 text-sm">
              <Check className="h-4 w-4 flex-none text-brand" aria-hidden />
              <span className="font-medium text-foreground">{c.name}</span>
              <span className="text-muted-foreground">{c.phone}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-4">
        <Field
          label="Emergency contact name"
          value={name}
          onChange={setName}
          placeholder="e.g. Grandma, or your partner"
        />
        <Field label="Relationship (optional)" value={relationship} onChange={setRelationship} />
        <Field label="Phone number" value={phone} onChange={setPhone} type="tel" />
        <Field
          label="What should a carer do in an emergency? (optional)"
          value={instructions}
          onChange={setInstructions}
          textarea
        />
      </div>
      <Actions
        busy={busy}
        onSkip={onNext}
        canSave={!adding || addIsComplete}
        onSave={async () => {
          const ok = await run(async () => {
            if (addIsComplete)
              await addContact({
                data: {
                  slug,
                  name: name.trim(),
                  relationship: relationship.trim(),
                  phone: phone.trim(),
                },
              });
            await saveProfile({ data: { slug, ...start, emergencyInstructions: instructions } });
          });
          if (ok) {
            setName("");
            setRelationship("");
            setPhone("");
            await onSaved();
            onNext();
          }
        }}
      />
    </>
  );
}

function ChildrenStep({ slug, data, onSaved, onNext }: StepProps) {
  const saveChild = useServerFn(saveChildFn);
  const blank = {
    name: "",
    dateOfBirth: "",
    school: "",
    allergies: "",
    dietary: "",
    medication: "",
  };
  const [child, setChild] = useState(blank);
  const set = (key: keyof typeof blank) => (value: string) =>
    setChild((c) => ({ ...c, [key]: value }));
  const { busy, run } = useSaving();
  const adding = !!child.name.trim();

  const addThis = () =>
    run(() =>
      saveChild({
        data: {
          slug,
          child: {
            name: child.name.trim(),
            ...(child.dateOfBirth ? { dateOfBirth: child.dateOfBirth } : {}),
            school: child.school,
            allergies: child.allergies,
            dietary: child.dietary,
            medication: child.medication,
          },
        },
      }),
    );

  return (
    <>
      {data.children.length > 0 && (
        <ul className="mb-5 space-y-2">
          {data.children.map((c, i) => (
            <li
              key={`${c.name}-${i}`}
              className="flex items-center gap-2 rounded-lg bg-card px-4 py-3 text-sm"
            >
              <Check className="h-4 w-4 flex-none text-brand" aria-hidden />
              <span className="font-medium text-foreground">{c.name}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-4">
        <Field label="Child's first name" value={child.name} onChange={set("name")} />
        <Field
          label="Date of birth (optional)"
          value={child.dateOfBirth}
          onChange={set("dateOfBirth")}
          type="date"
        />
        <Field label="School or nursery (optional)" value={child.school} onChange={set("school")} />
        <Field
          label="Allergies (optional)"
          value={child.allergies}
          onChange={set("allergies")}
          textarea
          placeholder="Or write 'none'"
        />
        <Field label="Dietary needs (optional)" value={child.dietary} onChange={set("dietary")} />
        <Field
          label="Regular medication (optional)"
          value={child.medication}
          onChange={set("medication")}
        />
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <Button
          size="lg"
          className="h-12 w-full text-base"
          disabled={busy || !adding}
          onClick={async () => {
            if (await addThis()) {
              setChild(blank);
              await onSaved();
              toast.success("Added. Add another child, or continue.");
            }
          }}
        >
          Save this child
        </Button>
        <Button
          variant={data.children.length ? "default" : "ghost"}
          className="h-11 w-full"
          disabled={adding}
          onClick={onNext}
        >
          {data.children.length ? "Continue" : "Skip for now"}
        </Button>
      </div>
    </>
  );
}

function StaffStep({ slug, data, onSaved, onNext }: StepProps) {
  const saveNanny = useServerFn(saveNannyFn);
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("nanny");
  const { busy, run } = useSaving();
  const adding = !!name.trim();
  return (
    <>
      {data.nannies.length > 0 && (
        <ul className="mb-5 space-y-2">
          {data.nannies.map((n) => (
            <li key={n.id} className="flex items-center gap-2 rounded-lg bg-card px-4 py-3 text-sm">
              <Check className="h-4 w-4 flex-none text-brand" aria-hidden />
              <span className="font-medium text-foreground">{n.name}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-4">
        <Field label="Their name" value={name} onChange={setName} />
        <label className="block">
          <span className="text-sm font-medium text-foreground">Their role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1.5 h-12 w-full rounded-md border border-input bg-card px-3 text-base"
          >
            {STAFF_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <Button
          size="lg"
          className="h-12 w-full text-base"
          disabled={busy || !adding}
          onClick={async () => {
            if (
              await run(() => saveNanny({ data: { slug, nanny: { name: name.trim(), role } } }))
            ) {
              setName("");
              await onSaved();
              toast.success("Added. Add someone else, or continue.");
            }
          }}
        >
          Save this person
        </Button>
        <Button
          variant={data.nannies.length ? "default" : "ghost"}
          className="h-11 w-full"
          disabled={adding}
          onClick={onNext}
        >
          {data.nannies.length ? "Continue" : "Skip for now"}
        </Button>
      </div>
    </>
  );
}

function AllSet({ slug, onBack }: { slug: string; onBack: () => void }): ReactNode {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <h1 className="heading-serif text-[1.75rem] leading-tight text-foreground">
        Your Family Wallet is ready
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        You can add or change anything later from People and Wallet. Your staff can be given their
        own private way in from the People tab.
      </p>
      <Button asChild size="lg" className="mt-6 h-12 w-full text-base">
        <Link to="/w/$slug" params={{ slug }}>
          Go to Home
        </Link>
      </Button>
      <Button variant="ghost" className="mt-2 h-11 w-full" onClick={onBack}>
        Back
      </Button>
    </main>
  );
}
