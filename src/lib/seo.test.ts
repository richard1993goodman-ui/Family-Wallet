import { describe, expect, it } from "vitest";

import { absolute, breadcrumbLd, faqLd, pageHead } from "./seo";

describe("pageHead", () => {
  const head = pageHead({ title: "Pricing", description: "Plans.", path: "/pricing" });

  it("sets a canonical address and matching og:url on this domain", () => {
    expect(head.links).toEqual([{ rel: "canonical", href: "https://familywallet.io/pricing" }]);
    expect(head.meta).toContainEqual({ property: "og:url", content: "https://familywallet.io/pricing" });
  });

  it("only adds noindex when asked", () => {
    expect(head.meta.some((m) => "name" in m && m.name === "robots")).toBe(false);
    const hidden = pageHead({ title: "x", description: "y", path: "/demo", noindex: true });
    expect(hidden.meta).toContainEqual({ name: "robots", content: "noindex, follow" });
  });

  it("writes each structured-data block as valid JSON with the schema.org context", () => {
    const withLd = pageHead({ title: "x", description: "y", path: "/", jsonLd: [faqLd([{ q: "Q?", a: "A." }])] });
    const parsed = JSON.parse(withLd.scripts[0]!.children);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("FAQPage");
    expect(parsed.mainEntity[0].acceptedAnswer.text).toBe("A.");
  });
});

describe("absolute", () => {
  it("has no trailing slash on the home page", () => expect(absolute("/")).toBe("https://familywallet.io"));
  it("joins a path", () => expect(absolute("/guides/x")).toBe("https://familywallet.io/guides/x"));
});

describe("breadcrumbLd", () => {
  it("numbers the trail from one", () => {
    const b = breadcrumbLd([{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }]) as { itemListElement: { position: number; item: string }[] };
    expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(b.itemListElement[1]!.item).toBe("https://familywallet.io/guides");
  });
});
