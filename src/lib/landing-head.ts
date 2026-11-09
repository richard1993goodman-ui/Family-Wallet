import type { PageContent } from "./landing-content";
import { articleLd, breadcrumbLd, faqLd, pageHead } from "./seo";

export type Crumb = { name: string; path: string };

/** The head tags, canonical address and structured data for one content page. */
export function contentHead(content: PageContent, crumbs: Crumb[]) {
  const guide = content.article;
  return pageHead({
    title: content.title,
    description: content.description,
    path: content.path,
    type: guide ? "article" : "website",
    ...(guide ? { published: guide.published, modified: guide.modified } : {}),
    jsonLd: [
      breadcrumbLd(crumbs),
      faqLd(content.faqs),
      ...(guide
        ? [
            articleLd({
              title: content.h1,
              description: content.description,
              path: content.path,
              published: guide.published,
              modified: guide.modified,
            }),
          ]
        : []),
    ],
  });
}
