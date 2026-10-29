export type TrainingQuestion = {
  id: string;
  section: string;
  question: string;
  options: string[];
};

export const TRAINING_SECTIONS = [
  "The after-school routine",
  "Safeguarding children",
  "Emergencies and first aid",
  "Food, health and wellbeing",
  "Professional conduct",
] as const;

export const PASS_MARK = 16;

export const TRAINING_QUESTIONS: TrainingQuestion[] = [
  {
    id: "q1",
    section: "The after-school routine",
    question: "You arrive at the school gate for pick-up. What should you do first?",
    options: [
      "Wait in the car and text the child to come out",
      "Check in at the agreed meeting point and make sure the school knows you are collecting",
      "Go straight to the classroom and take the child",
      "Ask another parent to bring them out to you",
    ],
  },
  {
    id: "q2",
    section: "The after-school routine",
    question: "A typical after-school shift runs smoothest when you:",
    options: [
      "Improvise each day so the children aren't bored",
      "Follow the family's agreed routine — snack, decompress, homework, activity, tidy up",
      "Do homework the moment you walk in, every time",
      "Leave everything for the parents when they get home",
    ],
  },
  {
    id: "q3",
    section: "The after-school routine",
    question: "A child says they have no homework, but the planner says otherwise. You should:",
    options: [
      "Take their word for it",
      "Make them do two hours of extra work",
      "Check the planner or school app calmly, and mention it in the daily log",
      "Phone the teacher at home",
    ],
  },
  {
    id: "q4",
    section: "The after-school routine",
    question: "Best practice for screen time is to:",
    options: [
      "Allow it whenever the children ask",
      "Ban screens entirely",
      "Follow the family's screen-time rules recorded in the family profile",
      "Use your own phone to keep them entertained",
    ],
  },
  {
    id: "q5",
    section: "The after-school routine",
    question: "At the end of your shift, the most useful thing you can leave behind is:",
    options: [
      "A tidy kitchen only",
      "A short daily log: what they did, what they ate, homework, mood and anything for tomorrow",
      "A long verbal handover at the door",
      "Nothing — parents can ask if they want to know",
    ],
  },
  {
    id: "q6",
    section: "Safeguarding children",
    question: "Safeguarding means:",
    options: [
      "Only acting when you see physical injuries",
      "Protecting children from harm, abuse and neglect, and acting on concerns",
      "Keeping the house secure",
      "Making sure the children are never upset",
    ],
  },
  {
    id: "q7",
    section: "Safeguarding children",
    question: "A child starts to disclose something worrying. You should:",
    options: [
      "Stop them and say you can't discuss it",
      "Ask lots of leading questions to get the full story",
      "Listen calmly, don't promise secrecy, don't lead them, and record what was said in their words",
      "Record it on your phone as video evidence",
    ],
  },
  {
    id: "q8",
    section: "Safeguarding children",
    question: "If you have a serious safeguarding concern about a child in your care, you should:",
    options: [
      "Post about it anonymously in a nanny group for advice",
      "Wait a few weeks to see if it happens again",
      "Report it the same day to Athlete Mannies and, where a child is at risk of harm, to children's social care or the police",
      "Confront the person you suspect",
    ],
  },
  {
    id: "q9",
    section: "Safeguarding children",
    question: "Photographs of the children should:",
    options: [
      "Never be posted on your social media; they are only shared with the parents in agreed ways",
      "Be posted if the child's face isn't clear",
      "Be shared with your friends privately",
      "Be posted if the parents once said a photo was lovely",
    ],
  },
  {
    id: "q10",
    section: "Safeguarding children",
    question: "Only adults named on the family's authorised list may collect a child. If someone else turns up saying the parent sent them, you:",
    options: [
      "Let them take the child to avoid a scene",
      "Do not release the child and phone the parent to confirm before anything else",
      "Ask the child if they know them and go from there",
      "Ask for ID and release the child if they have any",
    ],
  },
  {
    id: "q11",
    section: "Safeguarding children",
    question: "Safer working practice with children includes:",
    options: [
      "Keeping secrets with children to build trust",
      "Private messaging with children on your personal accounts",
      "Being transparent — visible care, agreed boundaries, and communication through the parents",
      "Offering lifts to children outside your working hours without telling parents",
    ],
  },
  {
    id: "q12",
    section: "Emergencies and first aid",
    question: "A child falls and is unresponsive but breathing. You should:",
    options: [
      "Sit them up and give them water",
      "Place them in the recovery position, call 999, and stay with them",
      "Drive them to hospital yourself",
      "Wait ten minutes to see if they come round",
    ],
  },
  {
    id: "q13",
    section: "Emergencies and first aid",
    question: "A child with a known nut allergy develops swelling of the lips and difficulty breathing. Your first action is:",
    options: [
      "Give antihistamine and wait",
      "Use their adrenaline auto-injector (EpiPen) straight away and call 999",
      "Phone the parents first for permission",
      "Give them a drink to clear their throat",
    ],
  },
  {
    id: "q14",
    section: "Emergencies and first aid",
    question: "A child is choking but can still cough forcefully. You should:",
    options: [
      "Start back blows immediately",
      "Put your fingers in their mouth to find the object",
      "Encourage them to keep coughing and stay with them, ready to act if it worsens",
      "Give them water to wash it down",
    ],
  },
  {
    id: "q15",
    section: "Emergencies and first aid",
    question: "The emergency card in the Family Wallet exists so that:",
    options: [
      "Parents have a record for insurance",
      "You can find contacts, allergies, medication, GP details and the home address in one tap",
      "The agency can audit the family",
      "It replaces calling 999",
    ],
  },
  {
    id: "q16",
    section: "Emergencies and first aid",
    question: "After any accident, injury or near miss, you should:",
    options: [
      "Only mention it if the child complains later",
      "Tell the parents the same day and record it in the daily log, with time, what happened and what you did",
      "Write it down only if a first-aid kit was used",
      "Keep it to yourself if the child seems fine",
    ],
  },
  {
    id: "q17",
    section: "Food, health and wellbeing",
    question: "Before giving any snack or meal you should:",
    options: [
      "Check the child's allergies and dietary notes in the family profile",
      "Ask the child what they fancy and give them that",
      "Assume last week's information still applies without checking",
      "Offer whatever is in the cupboard",
    ],
  },
  {
    id: "q18",
    section: "Food, health and wellbeing",
    question: "You may give a child medication when:",
    options: [
      "They say they usually have it",
      "The parents have given written permission with the dose and time, and you record what you gave",
      "You judge that they need it",
      "An older sibling confirms it",
    ],
  },
  {
    id: "q19",
    section: "Professional conduct",
    question: "A child is having a meltdown after a hard day at school. The best response is:",
    options: [
      "Send them to their room until they stop",
      "Stay calm, name the feeling, give them space and a snack, and follow up once they're settled",
      "Take away a privilege immediately",
      "Ignore it entirely",
    ],
  },
  {
    id: "q20",
    section: "Professional conduct",
    question: "You are going to be late for pick-up because of traffic. You should:",
    options: [
      "Drive faster and say nothing",
      "Tell the parents and the school as soon as you know, so cover can be arranged",
      "Wait and explain when you arrive",
      "Ask a friend to collect the child for you",
    ],
  },
];
