import { describe, expect, it } from "vitest";
import { mobileTabsFor, navFor, routePrefix } from "../../components/wallet-nav";
import { translate } from "./core";
import { enGB } from "./en-GB";

type Key = Parameters<typeof translate>[1];
type Vars = Parameters<typeof translate>[2];
const tPseudo = (key: Key, vars?: Vars) => translate("pseudo", key, vars);
const tEnglish = (key: Key, vars?: Vars) => translate("en-GB", key, vars);

describe("wallet menu translation", () => {
  it("has a catalogue entry for every page in both menus", () => {
    for (const role of ["family", "nanny"] as const) {
      for (const section of navFor(role, true, "nanny", tEnglish)) {
        for (const item of section.items) expect(`nav.${routePrefix(item.to)}` in enGB).toBe(true);
      }
    }
  });

  it("shows the same words as before in English, including who the household employs", () => {
    const english = navFor("family", true, "au pair", tEnglish).flatMap((s) =>
      s.items.map((i) => i.title),
    );
    const before = navFor("family", true, "au pair").flatMap((s) => s.items.map((i) => i.label));
    expect(english).toEqual(before);
    expect(english).toContain("Au pair agreement");
  });

  it("shows section names in English exactly as before", () => {
    const titles = navFor("family", true, "nanny", tEnglish).map((s) => s.title);
    expect(titles).toEqual(navFor("family", true, "nanny").map((s) => s.label));
  });

  it("shows translated titles but keeps the English label as the identity", () => {
    for (const section of navFor("family", true, "nanny", tPseudo)) {
      expect(section.title?.startsWith("⟦")).toBe(true);
      for (const item of section.items) {
        expect(item.title?.startsWith("⟦")).toBe(true);
        expect(item.label.startsWith("⟦")).toBe(false);
      }
    }
  });

  it("has a title for every phone tab", () => {
    for (const role of ["family", "nanny"] as const) {
      for (const tab of mobileTabsFor(role, tPseudo)) expect(tab.title?.startsWith("⟦")).toBe(true);
      expect(mobileTabsFor(role, tEnglish).map((t) => t.title)).toEqual(
        mobileTabsFor(role).map((t) => t.label),
      );
    }
  });
});
