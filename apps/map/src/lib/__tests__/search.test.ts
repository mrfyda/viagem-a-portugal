import { describe, expect, it } from "vitest";

import { bookPlaces } from "../book";
import { searchPlaces } from "../search";

describe("searchPlaces", () => {
  it("returns the whole catalogue, pt-collated, for an empty query", () => {
    const all = searchPlaces("   ");
    expect(all).toHaveLength(bookPlaces.length);
    const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name, "pt"));
    expect(all.map((p) => p.name)).toEqual(sorted.map((p) => p.name));
  });

  it("filters by name, case-insensitively", () => {
    const lower = searchPlaces("bragan");
    const upper = searchPlaces("BRAGAN");
    expect(lower.map((p) => p.indexName)).toEqual(upper.map((p) => p.indexName));
    expect(lower.length).toBeGreaterThan(0);
    for (const p of lower) expect(p.name.toLowerCase()).toContain("bragan");
  });

  it("returns nothing for a query that matches no Place", () => {
    expect(searchPlaces("zzzznotaplace")).toEqual([]);
  });
});
