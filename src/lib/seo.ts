// One place for the tags every public page needs: title, description, canonical address,
// share cards and structured data. Pages call pageHead() from their route's head().

export const SITE_URL = "https://familywallet.io";
export const SITE_NAME = "Family Wallet";
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

export type JsonLd = Record<string, unknown>;

export type PageSeo = {
  /** Under about 60 characters, with the main search phrase near the front. */
  title: string;
  /** Under about 155 characters. Written for the person reading the search result. */
  description: string;
  /** Path on this site, such as "/pricing". Becomes the canonical address. */
  path: string;
  image?: string;
  type?: "website" | "article";
  /** For pages that should not appear in search, such as the demo hand-off. */
  noindex?: boolean;
  jsonLd?: JsonLd[];
  /** ISO date, for articles. */
  published?: string;
  modified?: string;
};

export const absolute = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

export function pageHead(seo: PageSeo) {
  const url = absolute(seo.path);
  const image = seo.image ?? DEFAULT_IMAGE;
  return {
    meta: [
      { title: seo.title },
      { name: "description", content: seo.description },
      ...(seo.noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:url", content: url },
      { property: "og:type", content: seo.type ?? "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "en_GB" },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: seo.title },
      { name: "twitter:description", content: seo.description },
      { name: "twitter:image", content: image },
      ...(seo.published ? [{ property: "article:published_time", content: seo.published }] : []),
      ...(seo.modified ? [{ property: "article:modified_time", content: seo.modified }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: (seo.jsonLd ?? []).map((data) => ({
      type: "application/ld+json",
      children: JSON.stringify({ "@context": "https://schema.org", ...data }),
    })),
  };
}

/* ---------- Structured data builders ---------- */

export const organizationLd = (): JsonLd => ({
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512.png`,
  description:
    "A private app for families who employ a nanny, au pair or other household staff, and for agencies who want to give every family a wallet.",
});

export const websiteLd = (): JsonLd => ({
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  inLanguage: "en-GB",
  publisher: { "@id": `${SITE_URL}/#organization` },
});

export const softwareLd = (offers: { name: string; price: string; description: string }[]): JsonLd => ({
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#app`,
  name: SITE_NAME,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web, iOS and Android (installable web app)",
  url: SITE_URL,
  description:
    "Shared week, signed nanny agreement, daily log, timesheets, house manual and emergency card for families who employ a nanny, au pair or other household staff.",
  offers: offers.map((o) => ({
    "@type": "Offer",
    name: o.name,
    price: o.price,
    priceCurrency: "GBP",
    description: o.description,
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}/pricing`,
  })),
});

export const faqLd = (faqs: { q: string; a: string }[]): JsonLd => ({
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

export const breadcrumbLd = (crumbs: { name: string; path: string }[]): JsonLd => ({
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: absolute(c.path),
  })),
});

export const articleLd = (a: { title: string; description: string; path: string; published: string; modified: string }): JsonLd => ({
  "@type": "Article",
  headline: a.title,
  description: a.description,
  mainEntityOfPage: absolute(a.path),
  datePublished: a.published,
  dateModified: a.modified,
  image: DEFAULT_IMAGE,
  inLanguage: "en-GB",
  author: { "@id": `${SITE_URL}/#organization` },
  publisher: { "@id": `${SITE_URL}/#organization` },
});
