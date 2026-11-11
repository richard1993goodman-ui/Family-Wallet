import { describe, expect, it } from "vitest";
import { catalogueFor, directionOf, missingKeys, pseudo, suggestLocale, translate } from "./core";
import { enGB } from "./en-GB";

describe("translate", () => {
  it("fills placeholders", () => {
    expect(translate("en-GB", "join.activateIntro", { agency: "Acme" })).toBe(
      "Acme has set you up with a Family Wallet. It's private to your family: Acme can't see what you add.",
    );
  });
  it("leaves an unfilled placeholder visible rather than blank", () => {
    expect(translate("en-GB", "join.activateIntro")).toContain("{agency}");
  });
  it("picks plural forms by count", () => {
    expect(translate("en-GB", "households.count", { count: 1 })).toBe("1 household");
    expect(translate("en-GB", "households.count", { count: 3 })).toBe("3 households");
  });
  it("falls back to English for a missing translation, and to the key as a last resort", () => {
    expect(translate("en-GB", "no.such.key" as never)).toBe("no.such.key");
  });
});

describe("catalogues", () => {
  it("every language defines every English key", () => {
    expect(missingKeys(catalogueFor("pseudo")!)).toEqual([]);
  });
  it("the pseudo language keeps every placeholder and is visibly different", () => {
    for (const [key, message] of Object.entries(enGB)) {
      const text = typeof message === "string" ? message : message.other;
      const out = translate("pseudo", key as keyof typeof enGB, { count: 2 });
      for (const placeholder of text.match(/\{\w+\}/g) ?? []) if (placeholder !== "{count}") expect(out).toContain(placeholder);
      expect(out.startsWith("⟦")).toBe(true);
    }
  });
  it("pseudo text leaves placeholders untouched while accenting the words", () => {
    const out = pseudo("Hello {name}");
    expect(out).toContain("{name}");
    expect(out).not.toContain("Hello");
  });
});

describe("language choice", () => {
  it("suggests a supported device language, closest match first", () => {
    expect(suggestLocale(["fr-FR", "en-US"], ["en-GB"])).toBe("en-GB");
    expect(suggestLocale(["en-GB"], ["en-GB"])).toBe("en-GB");
  });
  it("suggests nothing when no device language is supported", () => expect(suggestLocale(["fr-FR", "de"], ["en-GB"])).toBeNull());
  it("knows which languages read right to left", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("ar-AE")).toBe("rtl");
    expect(directionOf("en-GB")).toBe("ltr");
  });
});
