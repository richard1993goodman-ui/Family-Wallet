export type PettyCashKind = "topup" | "spend";

export type PettyCashInput = {
  kind: PettyCashKind;
  entryDate: string;
  amount: number;
  description: string;
};

export type PettyCashRow = {
  id: string;
  kind: PettyCashKind;
  entryDate: string;
  amount: number;
  description: string;
  addedBy: string;
  addedByName: string | null;
};

export type PettyCashData = {
  access: "family" | "nanny";
  balance: number;
  entries: PettyCashRow[];
};

/** Float balance = money added by the family minus money spent by the nanny. */
export function pettyCashBalance(entries: { kind: PettyCashKind; amount: number }[]) {
  const pence = entries.reduce(
    (sum, e) => sum + (e.kind === "topup" ? 1 : -1) * Math.round(e.amount * 100),
    0,
  );
  return pence / 100;
}
