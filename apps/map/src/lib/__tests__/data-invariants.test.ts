import { describe, expect, it } from "vitest";

import { aliases, bookPlaceByName, bookPlaces, chapters } from "../book";
import corrections from "../../data/corrections.json";
import { routesGeoJson, stops, towns } from "../geo";

// Split homonym referents (e.g. "Lagoa de Óbidos") are real journey stops that
// are NOT toponymic-index entries; they carry their coordinate in corrections.
const correctedNames = new Set(
  (corrections as { name: string }[]).map((c) => c.name),
);

// generous Iberia-west box: continental Portugal + Spanish border places
const inRange = (lat: number, lon: number) =>
  lat >= 36.5 && lat <= 42.3 && lon >= -9.7 && lon <= -5.5;

describe("book index", () => {
  it("has unique indexNames", () => {
    expect(new Set(bookPlaces.map((p) => p.indexName)).size).toBe(
      bookPlaces.length,
    );
  });

  it("alias targets are real places", () => {
    for (const target of Object.values(aliases)) {
      expect(bookPlaceByName.has(target)).toBe(true);
    }
  });

  it("every place has ascending page references", () => {
    for (const p of bookPlaces) {
      expect(p.pages.length).toBeGreaterThan(0);
      expect([...p.pages].sort((a, b) => a - b)).toEqual(p.pages);
    }
  });
});

describe("chapters and sections", () => {
  it("has the six chapters with globally ordered sections", () => {
    expect(chapters).toHaveLength(6);
    const ordinals = chapters.flatMap((c) => c.sections.map((s) => s.ordinal));
    expect(ordinals).toEqual(
      Array.from({ length: ordinals.length }, (_, i) => i + 1),
    );
  });
});

describe("journey stops", () => {
  it("ordinals are strictly sequential", () => {
    expect(stops.map((s) => s.ordinal)).toEqual(
      Array.from({ length: stops.length }, (_, i) => i + 1),
    );
  });

  it("every stop references a known place and has coordinates in range", () => {
    for (const s of stops) {
      expect(
        bookPlaceByName.has(s.place) || correctedNames.has(s.place),
        s.place,
      ).toBe(true);
      expect(inRange(s.latitude, s.longitude), `${s.place} coords`).toBe(true);
      expect([1, 2, 3, 4, 5, 6]).toContain(s.chapter);
      expect(["stop", "passed-through"]).toContain(s.role);
    }
  });

  it("chapters are contiguous and all present", () => {
    const seq = stops.map((s) => s.chapter);
    expect(new Set(seq)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect([...seq].sort((a, b) => a - b)).toEqual(seq);
  });
});

describe("map data", () => {
  it("all rendered towns have coordinates in range", () => {
    expect(towns.length).toBeGreaterThan(550);
    for (const t of towns) {
      expect(inRange(t.latitude, t.longitude), t.name).toBe(true);
    }
  });

  it("derives route segments covering all six chapters", () => {
    const byChapter = new Set(
      routesGeoJson.features.map((f) => f.properties.chapter),
    );
    expect(byChapter).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    // one segment per consecutive same-chapter stop pair
    expect(routesGeoJson.features.length).toBe(stops.length - 6);
    for (const f of routesGeoJson.features) {
      expect(f.geometry.coordinates).toHaveLength(2);
      expect(f.properties.ordinal).toBeGreaterThan(1);
      expect(f.properties.ordinal).toBeLessThanOrEqual(stops.length);
    }
  });
});
