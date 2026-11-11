// Which links the mobile apps may open, and where they go. When someone taps a Family Wallet link on a phone that has
// the app installed, the app hands the address to this check. Only our own site and a short list of pages are allowed,
// so a crafted link can never steer the app to another site or to a page it should not open. Pure, so it is easy to test.

export const APP_HOST = "familywallet.io";

/** The first path segment of every page a link may open: invitations, claiming a login, and a household's pages. */
export const DEEP_LINK_PREFIXES = ["join", "claim", "w", "nanny", "account"] as const;

/**
 * The path (with any query) the app should open for a link, or null if the link is not one of ours.
 * Accepts https links on the main host only, never other hosts, schemes or look-alike hosts.
 */
export function deepLinkPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== APP_HOST || url.port || url.username || url.password) return null;
  const first = url.pathname.split("/").filter(Boolean)[0];
  if (!first || !(DEEP_LINK_PREFIXES as readonly string[]).includes(first)) return null;
  return url.pathname + url.search;
}
