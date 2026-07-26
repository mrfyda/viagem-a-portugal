import { describe, expect, it } from "vitest";

import { chapters } from "../book";
import { stops } from "../geo";
import {
  firstPage,
  journeyChapters,
  placeName,
  visitedInChapter,
} from "../journey";

describe("journeyChapters", () => {
  it("covers the book's six chapters in order", () => {
    expect(journeyChapters.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(journeyChapters.map((c) => c.title)).toEqual(
      chapters.map((c) => c.title),
    );
  });

  it("lists each Place once per section, stops outranking drive-throughs", () => {
    for (const chapter of journeyChapters) {
      for (const section of chapter.sections) {
        const names = section.places.map((p) => p.place);
        expect(new Set(names).size, `${chapter.number}/${section.ordinal}`).toBe(
          names.length,
        );
        // A Place recorded as a Stop anywhere in the section must read as one.
        for (const place of section.places) {
          const roles = stops
            .filter(
              (s) => s.section === section.ordinal && s.place === place.place,
            )
            .map((s) => s.role);
          if (roles.includes("stop")) expect(place.role).toBe("stop");
        }
      }
    }
  });

  it("keeps sections in narrative order and drops empty ones", () => {
    for (const chapter of journeyChapters) {
      const ordinals = chapter.sections.map((s) => s.ordinal);
      expect([...ordinals].sort((a, b) => a - b)).toEqual(ordinals);
      expect(chapter.sections.every((s) => s.places.length > 0)).toBe(true);
    }
  });

  it("counts every Stop of the journey exactly once across the chapters", () => {
    const listed = journeyChapters.flatMap((c) => c.stops.map((s) => s.place));
    // Deduped per chapter, so a Place revisited in a later chapter may recur —
    // but never twice inside one chapter.
    for (const chapter of journeyChapters) {
      const names = chapter.stops.map((s) => s.place);
      expect(new Set(names).size).toBe(names.length);
    }
    expect(listed.length).toBeGreaterThan(200);
  });

  it("reads from the first Stop to the last", () => {
    const first = journeyChapters[0];
    expect(first.from).toBe(placeName(first.stops[0].place));
    expect(first.to).toBe(placeName(first.stops[first.stops.length - 1].place));
  });
});

describe("visitedInChapter", () => {
  const chapter = journeyChapters[0];

  it("is zero without a visit log", () => {
    expect(visitedInChapter(chapter, null)).toBe(0);
  });

  it("counts only this chapter's Stops", () => {
    const mine = chapter.stops.slice(0, 3).map((s) => s.place);
    const elsewhere = journeyChapters[5].stops[0].place;
    const visits = new Map([...mine, elsewhere].map((p) => [p, null]));
    expect(visitedInChapter(chapter, visits)).toBe(3);
  });
});

describe("firstPage", () => {
  it("gives the earliest page the book mentions a Place on", () => {
    expect(firstPage("Bragança")).toBe(16);
  });

  it("is null for a Place the index does not carry", () => {
    expect(firstPage("Nowhere At All")).toBeNull();
  });
});
