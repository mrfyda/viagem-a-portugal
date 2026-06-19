import { describe, expect, it } from "vitest";

import { aliases } from "../book";
import { placeDetail } from "../place";

describe("placeDetail", () => {
  it("assembles a known Place from the book + journey data", () => {
    const d = placeDetail("Bragança");
    expect(d.book?.indexName).toBe("Bragança");
    expect(d.name).toBe(d.book?.name);
    // every journey Stop it returns is actually this Place
    for (const s of d.journeyStops) expect(s.place).toBe("Bragança");
    // prev/next are adjacent Places (or null at the ends), never itself
    expect(d.prev).not.toBe("Bragança");
    expect(d.next).not.toBe("Bragança");
  });

  it("derives alsoIndexedAs from the alias cross-references", () => {
    // pick any alias and assert its target lists it back
    const [from, to] = Object.entries(aliases)[0];
    expect(placeDetail(to).alsoIndexedAs).toContain(from);
  });

  it("degrades gracefully for an off-index name", () => {
    const d = placeDetail("Not A Real Place");
    expect(d.book).toBeUndefined();
    expect(d.name).toBe("Not A Real Place"); // falls back to the indexName
    expect(d.mentions).toEqual([]);
    expect(d.journeyStops).toEqual([]);
    expect(d.quote).toBeUndefined();
    expect(d.featured).toBeUndefined();
  });
});
