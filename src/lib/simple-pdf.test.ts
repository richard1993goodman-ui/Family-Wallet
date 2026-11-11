import { describe, expect, it } from "vitest";
import { encodeText, htmlToBlocks, textToPdf, wrap } from "./simple-pdf";

const text = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

describe("textToPdf", () => {
  const pdf = text(textToPdf([{ kind: "h1", text: "Title" }, { kind: "p", text: "Hello (world) \\ £5 — “quoted”" }, { kind: "li", text: "a point" }], { title: "T" }));

  it("is a well-formed PDF with a header, a trailer and a cross-reference table that points at itself", () => {
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    const start = Number(/startxref\n(\d+)/.exec(pdf)![1]);
    expect(pdf.slice(start, start + 4)).toBe("xref");
  });

  it("points every object entry at the right place", () => {
    const entries = [...pdf.matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(entries.length).toBeGreaterThan(5);
    entries.forEach((offset, i) => expect(pdf.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
  });

  it("escapes brackets and backslashes, and keeps pound signs and dashes readable", () => {
    expect(pdf).toContain("Hello \\(world\\) \\\\");
    expect(encodeText("£5")).toBe("£5");
    expect(encodeText("—").charCodeAt(0)).toBe(0x97);
  });

  it("replaces characters the built-in fonts cannot draw instead of failing", () => {
    expect(encodeText("日本")).toBe("??");
  });

  it("starts a new page when the text runs on", () => {
    const long = Array.from({ length: 200 }, (_, i) => ({ kind: "p" as const, text: `Line ${i} of a long agreement` }));
    const pages = Number(/\/Count (\d+)/.exec(text(textToPdf(long, { title: "T" })))![1]);
    expect(pages).toBeGreaterThan(1);
  });
});

describe("wrap", () => {
  it("wraps at the width and never runs off the line", () => {
    const lines = wrap("the quick brown fox jumps over the lazy dog", 12);
    expect(lines.every((l) => l.length <= 12)).toBe(true);
    expect(lines.join(" ")).toBe("the quick brown fox jumps over the lazy dog");
  });
  it("breaks a word that is longer than the line", () => {
    expect(wrap("x".repeat(25), 10)).toEqual(["x".repeat(10), "x".repeat(10), "x".repeat(5)]);
  });
});

describe("htmlToBlocks", () => {
  const html = `<article><header><h1>Nanny Agreement</h1><p>Version 2</p></header>
    <section><h2>1. Pay</h2><p>The rate is <strong>£15 &amp; more</strong> per hour.</p><ul><li>Paid monthly</li><li>By bank transfer</li></ul></section></article>`;
  const blocks = htmlToBlocks(html);

  it("keeps headings, paragraphs and list items in order, with the inline words joined up", () => {
    expect(blocks.filter((b) => b.kind !== "gap")).toEqual([
      { kind: "h1", text: "Nanny Agreement" },
      { kind: "p", text: "Version 2" },
      { kind: "h2", text: "1. Pay" },
      { kind: "p", text: "The rate is £15 & more per hour." },
      { kind: "li", text: "Paid monthly" },
      { kind: "li", text: "By bank transfer" },
    ]);
  });
  it("separates sections", () => expect(blocks.some((b) => b.kind === "gap")).toBe(true));
  it("never lets markup through", () => expect(JSON.stringify(blocks)).not.toContain("<"));
});
