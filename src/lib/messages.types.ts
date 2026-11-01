export const MESSAGE_TOPICS = [
  { id: "general", label: "General" },
  { id: "child", label: "Children" },
  { id: "school", label: "School & homework" },
  { id: "meals", label: "Meals" },
  { id: "health", label: "Health" },
  { id: "schedule", label: "Schedule & hours" },
  { id: "pay", label: "Pay & expenses" },
] as const;

export type MessageTopic = (typeof MESSAGE_TOPICS)[number]["id"];

export type HouseholdMessage = { id: string; sender: string; senderName: string | null; body: string; createdAt: string };
export type HouseholdThread = {
  id: string;
  topic: string;
  title: string;
  lastSender: string;
  unread: boolean;
  updatedAt: string;
  messages: HouseholdMessage[];
};
export type HouseholdMessagesData = { access: "family" | "nanny"; threads: HouseholdThread[] };
