import { describe, expect, it } from "vitest";

import { dictionaries, t } from "../i18n";

describe("i18n dictionaries", () => {
  it("pt covers every en key with all placeholders intact", () => {
    const keys = Object.keys(dictionaries.en) as (keyof typeof dictionaries.en)[];
    expect(Object.keys(dictionaries.pt).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(placeholders(dictionaries.pt[key]), key).toEqual(
        placeholders(dictionaries.en[key]),
      );
    }
  });

  it("t interpolates variables", () => {
    expect(t("stopOnRoute", { ordinal: 3, chapter: 1 })).toMatch(/3.+1/);
  });

  it("has the blog-mirroring nav labels in both languages", () => {
    expect(dictionaries.en.navMap).toBe("Map");
    expect(dictionaries.pt.navMap).toBe("Mapa");
  });
});
