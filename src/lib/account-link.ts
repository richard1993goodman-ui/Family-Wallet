// Who may be offered a wallet by the email they signed in with. Pure, so the rule is easy to test.

export type LinkCandidate = {
  /** The signed-in account's email, and whether Supabase has verified the person controls that inbox. */
  accountEmail: string | null;
  emailVerified: boolean;
  /** The email the family gave (at checkout, or entered by an agency). */
  contactEmail: string | null;
  familyStatus: string | null;
  owner: { personId: string | null } | null;
};

export const sameEmail = (a: string | null, b: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * True only when the person has proved they control the inbox, it is the wallet's contact email, the wallet is
 * active, and its owner has no login yet. Anything else is refused: this must never let someone take over a
 * wallet that already has an owner account.
 */
export function canLinkByEmail(c: LinkCandidate): boolean {
  return (
    c.emailVerified &&
    sameEmail(c.accountEmail, c.contactEmail) &&
    c.familyStatus === "active" &&
    !!c.owner &&
    c.owner.personId === null
  );
}

/** Escapes % _ and \ so an email is matched literally by ilike. */
export const likeLiteral = (value: string) => value.replace(/[\\%_]/g, "\\$&");
