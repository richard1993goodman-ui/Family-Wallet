// The public address families, nannies and partner agencies are sent.
// Preview and editor addresses are private (they show a proxy error to outsiders),
// so every link we generate or copy uses this canonical site instead.
export const PUBLIC_SITE_URL = "https://familywallet.io";

export function siteUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_SITE_URL}${suffix}`;
}
