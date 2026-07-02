import { describe, expect, it } from "vitest";

import { bookPlaces } from "../book";
import { towns } from "../geo";
import { searchPlaces } from "../search";

const selectable = new Set(towns.map((t) => t.name));
// The searchable catalogue: index Places that have a dot (corrections-only
// referents like "Lagoa de Óbidos" have dots but no index entry to search).
const searchable = bookPlaces.filter((p) => selectable.has(p.indexName));

describe("searchPlaces", () => {
  it("returns the selectable catalogue, pt-collated, for an empty query", () => {
    const all = searchPlaces("   ");
    expect(all).toHaveLength(searchable.length);
    const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name, "pt"));
    expect(all.map((p) => p.name)).toEqual(sorted.map((p) => p.name));
  });

  it("only offers Places that have a dot on the map", () => {
    for (const p of searchPlaces("")) expect(selectable.has(p.indexName)).toBe(true);
  });

  it("filters by name, case-insensitively", () => {
    const lower = searchPlaces("bragan");
    const upper = searchPlaces("BRAGAN");
    expect(lower.map((p) => p.indexName)).toEqual(upper.map((p) => p.indexName));
    expect(lower.length).toBeGreaterThan(0);
    for (const p of lower) expect(p.name.toLowerCase()).toContain("bragan");
  });

  it("matches regardless of diacritics", () => {
    const folded = searchPlaces("obidos");
    expect(folded.map((p) => p.indexName)).toContain("Óbidos");
    expect(searchPlaces("Óbidos").map((p) => p.indexName)).toEqual(
      folded.map((p) => p.indexName),
    );
  });

  it("ranks prefix matches before substring matches", () => {
    const results = searchPlaces("braga");
    const names = results.map((p) => p.name.toLowerCase());
    const firstSubstring = names.findIndex((n) => !n.startsWith("braga"));
    if (firstSubstring !== -1) {
      for (const name of names.slice(firstSubstring)) {
        expect(name.startsWith("braga")).toBe(false);
      }
    }
    expect(names[0].startsWith("braga")).toBe(true);
  });

  it("returns nothing for a query that matches no Place", () => {
    expect(searchPlaces("zzzznotaplace")).toEqual([]);
  });
});
