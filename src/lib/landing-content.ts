// The words on the search-focused pages. Kept as data so one layout renders every page,
// and so the sitemap, the structured data and the page itself always agree.

export type Section = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { caption: string; head: string[]; rows: string[][] };
};

export type PageContent = {
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  image?: { src: string; alt: string };
  sections: Section[];
  faqs: { q: string; a: string }[];
  cta: { heading: string; body: string; label: string; to: string };
  related: { label: string; to: string }[];
  sources?: { label: string; href: string }[];
  /** Guides only. */
  article?: { published: string; modified: string };
};

const FAMILY_FEATURES = [
  "A shared week that you and your nanny both see",
  "A daily log and end-of-day handover, so nothing lives only in a text thread",
  "A nanny agreement you build and both sign in the app",
  "Timesheets and expenses, approved in one place",
  "A house manual with WiFi, alarm and key-safe codes that stay hidden until someone taps Reveal",
  "An emergency card, a medication log with timestamped doses, and accident and incident reports",
  "Permissions for things like sun cream, photos and who may collect the children",
  "A Friday weekly report you can read in a minute",
];

export const LANDING: Record<"nanny" | "staff" | "agencies", PageContent> = {
  nanny: {
    path: "/nanny-management-app",
    title: "Nanny Management App for Parents | Family Wallet",
    description:
      "Run your nanny arrangement properly: shared week, signed agreement, daily log, timesheets and emergency card in one private app. From £7.99 a month.",
    h1: "The nanny management app for parents",
    intro:
      "If your nanny arrangement lives across WhatsApp, a spreadsheet and a contract buried in your email, the Family Wallet puts it in one private place that both of you can open from your phones.",
    image: {
      src: "/images/kids/school-run.jpg",
      alt: "A line of children in sun hats and bright backpacks walking away from the camera on the school run",
    },
    sections: [
      {
        heading: "What you stop doing",
        paragraphs: [
          "Most families start with good intentions and a group chat. A few months in, the hours are in one place, the house rules in another, and nobody can find the signed contract. The Family Wallet is built for the family you already have, not for finding a new nanny.",
        ],
        bullets: [
          "Scrolling a chat to find what time pick-up changed to",
          "Adding up hours from memory on the last day of the month",
          "Texting to ask whether Calpol has already been given",
          "Searching your email for the agreement, again",
        ],
      },
      { heading: "What is in your wallet", bullets: FAMILY_FEATURES },
      {
        heading: "How it works",
        bullets: [
          "Subscribe on the pricing page. Your private wallet is created straight away, with a link and an access code.",
          "Add your nanny. They get their own sign-in code and never pay anything.",
          "Run the week: plan it together, log each day, approve hours, and keep every record in one place.",
        ],
      },
      {
        heading: "Private by design",
        paragraphs: [
          "Your wallet sits behind a private link and access code. There are no adverts and nothing is shown to other families. Sensitive details, such as alarm and key-safe codes, stay hidden until someone chooses to reveal them, and they never appear in a message.",
        ],
      },
      {
        heading: "Works alongside your payroll",
        paragraphs: [
          "The Family Wallet is not a payroll service. It keeps the agreement, the hours and the records tidy, and includes an employment cost calculator, so you know what a nanny really costs before you hire. Use it with whichever payroll provider you already trust.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is this an app for finding a nanny?",
        a: "No. It is for managing the nanny you already employ: the week, the agreement, the logs, the hours and the records. If you need to find a nanny, a nanny agency or a childcare marketplace is the right place to start.",
      },
      {
        q: "Does my nanny need to pay or create an account?",
        a: "No. Your nanny never pays. You invite them from your wallet and they sign in with their own code.",
      },
      {
        q: "Do I need to download anything?",
        a: "No. It works in your phone or computer's web browser, and you can add it to your home screen so it opens like an app.",
      },
      {
        q: "How much does it cost?",
        a: "The Family plan is £7.99 a month, or £79 a year, for one nanny or au pair. The Household plan is £14.99 a month for up to six staff. Prices exclude VAT.",
      },
      {
        q: "Is my family's information private?",
        a: "Yes. Each wallet is private to your household and your staff, behind a link and access code. Alarm and key-safe codes stay hidden until revealed.",
      },
    ],
    cta: {
      heading: "See it with a sample family",
      body: "Open the demo wallet to tap through the week, the daily log and the agreement, then pick a plan when you are ready.",
      label: "See pricing",
      to: "/pricing",
    },
    related: [
      { label: "Household staff app", to: "/household-staff-app" },
      { label: "Nanny contract guide", to: "/guides/nanny-contract-uk" },
      { label: "What a nanny costs in the UK", to: "/guides/how-much-does-a-nanny-cost-uk" },
    ],
  },

  staff: {
    path: "/household-staff-app",
    title: "Household Staff Management App | Family Wallet",
    description:
      "One private app for your nanny, au pair, housekeeper, cook, driver and PA. Roles, agreements, rotas and timesheets for every member of your household team.",
    h1: "One app for your whole household team",
    intro:
      "A busy home often has more than one person helping: a nanny, an au pair, a housekeeper, a driver. The Family Wallet gives each of them a role and their own sign-in, and keeps everyone's week, hours and agreement in one private place.",
    image: {
      src: "/images/kids/chef.jpg",
      alt: "A toddler in a chef's hat and apron stirring an empty pan in a bright kitchen",
    },
    sections: [
      {
        heading: "Roles you can add",
        paragraphs: ["Pick a role from a simple dropdown when you add someone. Each person is set up separately."],
        bullets: [
          "Nanny",
          "Au pair",
          "Maternity nurse",
          "Housekeeper",
          "Cook",
          "Driver",
          "Personal assistant",
          "Tutor",
          "Anything else",
        ],
      },
      {
        heading: "What each person gets",
        bullets: [
          "Their own sign-in code, so you never share one login",
          "Their own agreement, built and signed in the app",
          "A shared calendar and their own timesheets and leave requests",
          "Access to the house manual and emergency card, with sensitive codes hidden until revealed",
        ],
      },
      {
        heading: "How many people can I add?",
        paragraphs: [
          "The Family plan covers one nanny or au pair. The Household plan covers up to six staff, so a nanny, an au pair, a housekeeper and more can all sit in one wallet. Staff never pay.",
        ],
      },
      {
        heading: "Au pairs and live-in help",
        paragraphs: [
          "Au pairs and live-in staff use the same shared week, house rules, daily log and emergency details as everyone else. Dedicated tools for au pair hours and days off are coming, and are marked as coming soon on the pricing page.",
        ],
      },
      {
        heading: "Everything stays private to your home",
        paragraphs: [
          "Everyone you add sees only your household's wallet. Your link and access code stay with you, and you can remove a person at any time without losing the signed records.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I use it for an au pair as well as a nanny?",
        a: "Yes. On the Household plan you can add a nanny and an au pair, each with their own role, sign-in and agreement.",
      },
      {
        q: "Do my staff need to pay?",
        a: "No. Only the household subscribes. Nannies, au pairs and other staff always join free.",
      },
      {
        q: "What if I have more than six staff?",
        a: "Get in touch about the Estate plan, which is priced to larger households and family offices.",
      },
      {
        q: "Does it handle payroll for each person?",
        a: "No. It keeps agreements, hours and records, and includes an employment cost calculator. Use it alongside your payroll provider.",
      },
    ],
    cta: {
      heading: "Set up your household team",
      body: "The Household plan covers up to six staff for £14.99 a month, excluding VAT.",
      label: "See pricing",
      to: "/pricing",
    },
    related: [
      { label: "Nanny management app", to: "/nanny-management-app" },
      { label: "For agencies", to: "/for-agencies" },
      { label: "Nanny contract guide", to: "/guides/nanny-contract-uk" },
    ],
  },

  agencies: {
    path: "/for-agencies",
    title: "Family App for Nanny Agencies | The Family Wallet",
    description:
      "Give every client family a branded wallet. Agreements, rotas, daily logs and a dashboard that shows who is active. Plans from £39 a month, nannies free.",
    h1: "Give every family you place a wallet with your name on it",
    intro:
      "Your families remember how the first month went. The Family Wallet gives them a private place for the agreement, the week and the daily log, branded as yours, and gives your team a dashboard to see who is using it.",
    image: {
      src: "/images/london/colouring.jpg",
      alt: "Two children colouring in Easter pictures with felt-tip pens at a table in the sun",
    },
    sections: [
      {
        heading: "Why agencies use it",
        bullets: [
          "Stand out at the point where most agencies disappear after placement",
          "Give families something that makes your membership feel like a service, not just an introduction",
          "See at a glance which households are active and which have never opened their wallet",
        ],
      },
      {
        heading: "What you get",
        bullets: [
          "Your own name and logo across your families' wallets, with Powered by The Family Wallet",
          "An agency dashboard with an allowance meter, filters, search and each household's staff and last-opened date",
          "Agreements, shared weeks, daily logs, timesheets, emergency cards and more for every family",
          "Manage your own perks, playbooks and challenges for your families",
          "Nannies and au pairs are always free, and never count towards your allowance",
        ],
      },
      {
        heading: "Plans that grow with you",
        table: {
          caption: "Agency plans, billed monthly, excluding VAT",
          head: ["Plan", "Price", "Active households included"],
          rows: [
            ["Partner", "£39 a month", "10"],
            ["Growth", "£119 a month", "50"],
            ["Scale", "£199 a month", "100"],
            ["Enterprise", "Talk to us", "100 and over"],
          ],
        },
        paragraphs: [
          "A household counts as active when someone has opened its wallet in the last 30 days, so quiet clients never push you over your allowance.",
        ],
      },
      {
        heading: "Getting started",
        bullets: [
          "Tell us about your agency and we set up your account and branding.",
          "Add each family in your dashboard and copy their link and access code to send on.",
          "Watch the dashboard to see who has opened their wallet and nudge those who have not.",
        ],
      },
    ],
    faqs: [
      {
        q: "Who pays, the agency or the family?",
        a: "You choose. Many agencies include the wallet in their membership. You can also resell it to families, or refer families to subscribe themselves.",
      },
      {
        q: "Do my nannies need a paid seat?",
        a: "No. Nanny and au pair seats are free and unlimited. You only count active households.",
      },
      {
        q: "What counts as an active household?",
        a: "One where someone has opened the wallet in the last 30 days. Households that have gone quiet do not count towards your allowance.",
      },
      {
        q: "Can I bring my existing families on?",
        a: "Yes. Add each family in your dashboard and copy their link and access code to send on. Bulk import from a spreadsheet is coming.",
      },
      {
        q: "Is there a setup fee or a contract?",
        a: "No setup fee. Plans are monthly and you can cancel with a month's notice.",
      },
    ],
    cta: {
      heading: "Talk to us about your agency",
      body: "We will set up your account, branding and first families with you.",
      label: "See agency plans",
      to: "/pricing?for=agencies",
    },
    related: [
      { label: "Pricing", to: "/pricing?for=agencies" },
      { label: "Household staff app", to: "/household-staff-app" },
      { label: "Guides", to: "/guides" },
    ],
  },
};

const GUIDE_DATE = "2026-11-08";

export const GUIDES: Record<string, PageContent> = {
  "nanny-contract-uk": {
    path: "/guides/nanny-contract-uk",
    title: "Nanny Contract UK: What to Include (2026 Guide)",
    description:
      "What a UK nanny contract needs: pay, hours, holiday, notice, pension and more. A plain-English checklist for parents, plus how to build and sign yours online.",
    h1: "Nanny contract UK: what to include",
    intro:
      "If you employ a nanny in your home, you are an employer with real responsibilities, and a clear written contract protects both of you. This is a plain-English checklist of what a good nanny contract covers.",
    article: { published: GUIDE_DATE, modified: GUIDE_DATE },
    sections: [
      {
        heading: "Do I need a written contract?",
        paragraphs: [
          "In the UK, employers must give employees a written statement of the main terms of employment on or before their first day of work. A nanny employed directly by a family is usually an employee, so this applies to most families. A fuller contract goes beyond the minimum and spells out the details that matter in a family home.",
          "Employment status can be complicated, particularly for self-employed nannies. If you are unsure, check GOV.UK or take professional advice.",
        ],
      },
      {
        heading: "The checklist",
        bullets: [
          "Who is involved: the full names and addresses of the employer and the nanny",
          "Start date, and a probation period if you want one",
          "Job title and a clear description of duties, including any household tasks such as children's laundry or meals",
          "Place of work, and whether the role is live-in or live-out",
          "Working hours and days, how overtime and late finishes are handled and paid",
          "Pay: the gross rate, how often it is paid, and the payment date",
          "Holiday: the annual entitlement, how it is booked, and how it works with your own family holidays",
          "Sickness: what is paid and what you expect when your nanny is unwell",
          "Notice: how much notice each side gives, and what happens on termination",
          "Pension: whether workplace pension duties apply to you and how contributions work",
          "Expenses: what is reimbursed, such as travel, activities and food, and how receipts are shared",
          "Use of your car or the nanny's own car, with the insurance needed",
          "Confidentiality, photos of the children and social media",
          "Cameras in your home, if you have them, so your nanny knows",
          "Disciplinary and grievance steps, which ACAS publishes guidance on",
        ],
      },
      {
        heading: "Pay, tax and payslips",
        paragraphs: [
          "As an employer you will usually need to register with HMRC, run PAYE, deduct tax and National Insurance, and give your nanny a payslip each time they are paid. Many families use a payroll service for this. The Family Wallet is not a payroll service, but it keeps the agreement, the hours and the records in one place and includes an employment cost calculator so you know the true cost before you hire.",
        ],
      },
      {
        heading: "Holiday and sickness",
        paragraphs: [
          "Most workers are entitled to paid statutory holiday, and part-time staff get a pro-rata share. Write down how holiday is requested and agreed, and what happens if your plans change at short notice. For sickness, put in writing what you will pay and how you expect to be told.",
        ],
      },
      {
        heading: "Build and sign yours online",
        paragraphs: [
          "The Family Wallet includes an agreement builder. You choose the clauses that fit your family, and you and your nanny both sign in the app. The signed agreement is stored next to your shared week, timesheets and daily log, so you can always find it.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is a verbal agreement enough?",
        a: "Employees are entitled to a written statement of the main terms of employment from their first day, so a verbal agreement on its own is not enough. A written contract also settles questions about hours, holiday and notice before they become disagreements.",
      },
      {
        q: "Can I use a free template?",
        a: "Free templates are a reasonable starting point, but they need to be adapted to your family's hours, duties and household rules. Check the result against GOV.UK guidance or ask a professional if you are unsure.",
      },
      {
        q: "Who should sign it?",
        a: "The employer, which is you or both parents, and the nanny, ideally before the first day of work. In the Family Wallet both of you sign in the app.",
      },
      {
        q: "What if the terms change later?",
        a: "Agree any change in writing with your nanny and update the agreement. Keeping it in one place makes it easy to see the latest version.",
      },
    ],
    cta: {
      heading: "Build your agreement in the Family Wallet",
      body: "Choose your clauses, then both sign in the app. Plans start at £7.99 a month.",
      label: "See pricing",
      to: "/pricing",
    },
    related: [
      { label: "What a nanny costs in the UK", to: "/guides/how-much-does-a-nanny-cost-uk" },
      { label: "Nanny management app", to: "/nanny-management-app" },
      { label: "Household staff app", to: "/household-staff-app" },
    ],
    sources: [
      { label: "GOV.UK: Employing someone to work in your home", href: "https://www.gov.uk/employing-someone-to-work-in-your-home" },
      { label: "ACAS: guidance for employers", href: "https://www.acas.org.uk" },
    ],
  },

  "how-much-does-a-nanny-cost-uk": {
    path: "/guides/how-much-does-a-nanny-cost-uk",
    title: "How Much Does a Nanny Cost in the UK? (2026)",
    description:
      "Typical nanny pay in London and the UK, what employers pay on top, and how to work out the true cost of a nanny before you hire.",
    h1: "How much does a nanny cost in the UK?",
    intro:
      "The hourly rate is only part of the cost. This guide shows what nannies typically earn in 2026, what you pay on top, and how to work out the real figure before you commit.",
    article: { published: GUIDE_DATE, modified: GUIDE_DATE },
    sections: [
      {
        heading: "What nannies typically cost per hour",
        paragraphs: [
          "Nannytax's 2026 figures for part-time nannies, which include employer costs, put the typical cost at roughly the following. Your own figure will vary with experience, qualifications, hours and the number of children.",
        ],
        table: {
          caption: "Typical part-time nanny cost per hour, 2026 (source: Nannytax)",
          head: ["Area", "Approximate cost per hour"],
          rows: [
            ["London", "£21.63"],
            ["Home Counties", "£22.64"],
            ["Elsewhere in the UK", "£17.56"],
          ],
        },
      },
      {
        heading: "What you pay on top of pay",
        bullets: [
          "Employer National Insurance on earnings above the threshold",
          "A minimum employer contribution to a workplace pension, where the duty applies to you",
          "Paid holiday, which is part of the cost of every hour worked",
          "Statutory sick pay in some cases",
          "Payroll fees if you use a service to run PAYE and payslips",
          "Expenses such as travel and activities",
        ],
      },
      {
        heading: "Agency fees",
        paragraphs: [
          "If you find your nanny through an agency, a one-off placement fee is common. Many UK agencies charge between roughly 13% and 20% of the nanny's gross annual salary, plus VAT, though fees vary. Ask what is included, such as a replacement period if the placement does not work out.",
        ],
      },
      {
        heading: "Work out the true cost",
        paragraphs: [
          "Start with the gross hourly rate and the weekly hours, then add employer National Insurance, pension, holiday and payroll fees. The Family Wallet includes an employment cost calculator that does this for you, and you can try it in the demo wallet.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is a nanny cheaper than nursery?",
        a: "It depends on how many children you have and the hours you need. A nanny can cost more for one child and less for two or three, and gives you flexibility at home. Work out both costs for your own family before deciding.",
      },
      {
        q: "Do I pay a nanny gross or net?",
        a: "Pay is usually agreed as a gross figure. As an employer you deduct tax and National Insurance and pay your nanny the net amount, with a payslip each time.",
      },
      {
        q: "What else should I budget for?",
        a: "Employer National Insurance, pension, paid holiday, payroll fees and expenses, plus an agency fee if you use one.",
      },
    ],
    cta: {
      heading: "Try the cost calculator in the demo wallet",
      body: "See pay, employer National Insurance and pension worked out for a sample family, then plan your own.",
      label: "Open the demo cost calculator",
      to: "/costs/demo",
    },
    related: [
      { label: "Nanny contract guide", to: "/guides/nanny-contract-uk" },
      { label: "Nanny management app", to: "/nanny-management-app" },
      { label: "Pricing", to: "/pricing" },
    ],
    sources: [
      { label: "Nannytax: how much does a part-time nanny cost in 2026", href: "https://www.nannytax.co.uk/news/how-much-does-a-part-time-nanny-cost-2026" },
      { label: "Bubble: nanny agencies in the UK, how they work and what they cost", href: "https://joinbubble.com/nanny-agencies-uk-how-they-work-cost-choose" },
    ],
  },
};

export const GUIDE_LIST = Object.entries(GUIDES).map(([slug, g]) => ({ slug, ...g }));
