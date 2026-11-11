// A small PDF writer for plain-text records, with no dependencies. Text only, in the built-in Courier fonts so every
// line is the same width and wrapping is exact. Pure, so it is easy to test.

export type PdfBlock = { kind: "h1" | "h2" | "p" | "li" | "rule" | "gap"; text?: string };

const PAGE = { w: 595, h: 842, margin: 56 };
const SIZES = { h1: 14, h2: 11, p: 10, li: 10 } as const;
const LEADING = { h1: 20, h2: 16, p: 13, li: 13, rule: 10, gap: 8 } as const;
const GLYPH = 0.6; // every Courier glyph is 0.6 of the font size wide

/** The standard Windows-1252 bytes PDF's built-in fonts understand. Anything else becomes "?". */
const WIN_ANSI: Record<string, number> = {
  "€": 0x80,
  "…": 0x85,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
};
export function encodeText(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    const code = ch.codePointAt(0)!;
    if (ch === "\\" || ch === "(" || ch === ")") out += "\\" + ch;
    else if (code >= 32 && code <= 126) out += ch;
    else if (WIN_ANSI[ch] !== undefined) out += String.fromCharCode(WIN_ANSI[ch]!);
    else if (code >= 0xa0 && code <= 0xff) out += ch;
    else out += code === 9 ? " " : "?";
  }
  return out;
}

/** Words wrapped to a number of characters, with very long words broken so nothing runs off the page. */
export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    let word = raw;
    while (word.length > width) {
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += " " + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

type Line = { text: string; font: "F1" | "F2"; size: number; indent: number; leading: number };

function layout(blocks: PdfBlock[]): Line[][] {
  const usable = PAGE.w - PAGE.margin * 2;
  const lines: Line[] = [];
  for (const b of blocks) {
    if (b.kind === "gap") {
      lines.push({ text: "", font: "F1", size: 10, indent: 0, leading: LEADING.gap });
      continue;
    }
    if (b.kind === "rule") {
      lines.push({
        text: "-".repeat(Math.floor(usable / (GLYPH * 10))),
        font: "F1",
        size: 10,
        indent: 0,
        leading: LEADING.rule,
      });
      continue;
    }
    const size = SIZES[b.kind];
    const indent = b.kind === "li" ? 14 : 0;
    const width = Math.floor((usable - indent) / (GLYPH * size));
    const wrapped = wrap(b.kind === "li" ? `- ${b.text ?? ""}` : (b.text ?? ""), width);
    wrapped.forEach((text, i) =>
      lines.push({
        text,
        font: b.kind === "h1" || b.kind === "h2" ? "F2" : "F1",
        size,
        indent: b.kind === "li" && i > 0 ? indent + GLYPH * size * 2 : indent,
        leading: LEADING[b.kind],
      }),
    );
  }
  const pages: Line[][] = [[]];
  let y = PAGE.h - PAGE.margin;
  for (const line of lines) {
    if (y - line.leading < PAGE.margin) {
      pages.push([]);
      y = PAGE.h - PAGE.margin;
    }
    pages[pages.length - 1]!.push(line);
    y -= line.leading;
  }
  return pages;
}

/** The PDF file as bytes. */
export function textToPdf(blocks: PdfBlock[], meta: { title: string }): Uint8Array {
  const pages = layout(blocks);
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const catalog = add("");
  const pagesRoot = add("");
  const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  const f2 = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>",
  );
  const info = add(`<< /Title (${encodeText(meta.title)}) /Producer (Family Wallet) >>`);
  const pageIds: number[] = [];
  for (const page of pages) {
    let y = PAGE.h - PAGE.margin;
    const ops: string[] = [];
    for (const line of page) {
      y -= line.leading;
      if (line.text)
        ops.push(
          `BT /${line.font} ${line.size} Tf 1 0 0 1 ${PAGE.margin + line.indent} ${y + (line.leading - line.size) / 2} Tm (${encodeText(line.text)}) Tj ET`,
        );
    }
    const stream = ops.join("\n");
    const content = add(
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    );
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesRoot} 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`,
      ),
    );
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesRoot} 0 R >>`;
  objects[pagesRoot - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets: number[] = [];
  let length = chunks[0]!.length;
  objects.forEach((body, i) => {
    offsets.push(length);
    const chunk = Buffer.from(`${i + 1} 0 obj\n${body}\nendobj\n`, "latin1");
    chunks.push(chunk);
    length += chunk.length;
  });
  const xref = [
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`,
    ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`),
  ].join("");
  chunks.push(
    Buffer.from(
      `${xref}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${length}\n%%EOF\n`,
      "latin1",
    ),
  );
  return new Uint8Array(Buffer.concat(chunks));
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};
const decode = (s: string) =>
  s.replace(/&(?:amp|lt|gt|quot|nbsp|#x27|#39);/g, (m) => ENTITIES[m] ?? m);

/**
 * Turns the HTML our own document components produce (headings, paragraphs, lists, definition lists) into blocks.
 * It is not a general HTML converter: it only understands the few tags those components use.
 */
export function htmlToBlocks(html: string): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  let kind: PdfBlock["kind"] | null = null;
  let buffer = "";
  const flush = () => {
    const text = decode(buffer).replace(/\s+/g, " ").trim();
    if (kind && text) blocks.push({ kind, text });
    kind = null;
    buffer = "";
  };
  for (const token of html.split(/(<[^>]+>)/)) {
    if (!token) continue;
    if (!token.startsWith("<")) {
      if (kind) buffer += token;
      continue;
    }
    const m = /^<(\/?)([a-z0-9]+)/i.exec(token);
    if (!m) continue;
    const closing = m[1] === "/";
    const tag = m[2]!.toLowerCase();
    if (["h1", "h2", "p", "li", "dt", "dd"].includes(tag)) {
      if (closing) flush();
      else {
        flush();
        kind = tag === "h1" ? "h1" : tag === "h2" ? "h2" : tag === "li" ? "li" : "p";
      }
    } else if (tag === "br" && kind) buffer += " ";
    else if (closing && ["section", "header"].includes(tag)) {
      flush();
      blocks.push({ kind: "gap" });
    }
  }
  flush();
  return blocks;
}
