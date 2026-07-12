import { describe, expect, it } from "vitest";

import { achievements, chapterStopPlaces, fourCorners, lockedChurches } from "../achievements";
import { bookPlaceByName, chapters } from "../book";
import { towns } from "../geo";

const visitMap = (names: Iterable<string>, date: string | null = null) =>
  new Map([...names].map((name) => [name, date]));

const byId = (visits: ReadonlyMap<string, string | null>) =>
  new Map(achievements(visits).map((a) => [a.id, a]));

describe("achievements", () => {
  it("starts fully locked with zero progress", () => {
    for (const a of achievements(new Map())) {
      expect(a.unlocked, a.id).toBe(false);
      expect(a.current, a.id).toBe(0);
      expect(a.target, a.id).toBeGreaterThan(0);
    }
  });

  it("unlocks the first stop on a single mappable visit", () => {
    const first = byId(visitMap([towns[0].name])).get("first-stop")!;
    expect(first.unlocked).toBe(true);
    expect(first.current).toBe(1);
  });

  it("ignores visits to places without a marker", () => {
    const all = achievements(visitMap(["not a real place"]));
    expect(all.every((a) => a.current === 0)).toBe(true);
  });

  it("clamps tally progress at the target", () => {
    const visits = visitMap(towns.slice(0, 30).map((t) => t.name));
    const ten = byId(visits).get("towns-10")!;
    expect(ten.current).toBe(10);
    expect(ten.unlocked).toBe(true);
  });

  it("completes a chapter when every one of its stops is visited", () => {
    const places = chapterStopPlaces(1);
    expect(places.size).toBeGreaterThan(0);
    const all = byId(visitMap(places));
    const chapter1 = all.get("chapter-1")!;
    expect(chapter1.unlocked).toBe(true);
    expect(chapter1.current).toBe(places.size);
    // Other chapters stay locked; the full journey is only part-way.
    expect(all.get("chapter-2")!.unlocked).toBe(false);
    const journey = all.get("full-journey")!;
    expect(journey.unlocked).toBe(false);
    expect(journey.current).toBe(places.size);
  });

  it("unlocks the full journey once every chapter's stops are visited", () => {
    const visits = visitMap(
      chapters.flatMap((c) => [...chapterStopPlaces(c.number)]),
    );
    const all = byId(visits);
    for (const c of chapters) {
      expect(all.get(`chapter-${c.number}`)!.unlocked, `chapter ${c.number}`).toBe(true);
    }
    expect(all.get("full-journey")!.unlocked).toBe(true);
  });

  it("carries interpolation vars for every key", () => {
    for (const a of achievements(new Map())) {
      // Chapter rows label themselves with the book's chapter title.
      if (a.chapter != null) expect(a.vars.title).toBeTruthy();
    }
  });
});

describe("quirky achievements", () => {
  it("includes every storied place — each still has a marker", () => {
    const all = byId(new Map());
    const storiedIds = [
      // First batch.
      "best-meal", "birthplace", "highest-village", "nests", "rio-de-onor",
      // Second batch, mined from the full text.
      "saint-of-rats", "devil-by-horn", "granite-sow", "sky-cataract",
      "ring-and-wait", "flickering-light", "night-in-the-car", "ban-the-weddings",
      "leave-your-id", "sparrows-pardon", "director-and-museum", "journeys-end",
    ];
    for (const id of storiedIds) {
      expect(all.get(id), id).toBeDefined();
      expect(all.get(id)!.target, id).toBe(1);
    }
  });

  it("unlocks the best meal in Barcelos", () => {
    expect(byId(visitMap(["Barcelos"])).get("best-meal")!.unlocked).toBe(true);
  });

  it("requires every locked-church town for the collection", () => {
    expect(lockedChurches.size).toBeGreaterThan(1);
    // Every town in the roster still has a marker to visit.
    for (const place of lockedChurches) {
      expect(towns.some((t) => t.name === place), place).toBe(true);
    }
    const partial = byId(visitMap([[...lockedChurches][0]])).get("locked-churches")!;
    expect(partial.current).toBe(1);
    expect(partial.unlocked).toBe(false);
    const full = byId(visitMap(lockedChurches)).get("locked-churches")!;
    expect(full.current).toBe(lockedChurches.size);
    expect(full.unlocked).toBe(true);
  });

  it("requires all four compass extremes for the four corners", () => {
    expect(fourCorners.size).toBe(4);
    const partial = byId(visitMap([[...fourCorners][0]])).get("four-corners")!;
    expect(partial.current).toBe(1);
    expect(partial.unlocked).toBe(false);
    expect(byId(visitMap(fourCorners)).get("four-corners")!.unlocked).toBe(true);
  });

  it("unlocks the footnote only for a single-page place", () => {
    const onePage = towns.find(
      (t) => bookPlaceByName.get(t.name)?.pages.length === 1,
    )!;
    const manyPages = towns.find(
      (t) => (bookPlaceByName.get(t.name)?.pages.length ?? 0) > 1,
    )!;
    expect(byId(visitMap([manyPages.name])).get("footnote")!.unlocked).toBe(false);
    expect(byId(visitMap([onePage.name])).get("footnote")!.unlocked).toBe(true);
  });

  it("counts the busiest day for the same-day achievement, skipping undated visits", () => {
    const names = towns.slice(0, 6).map((t) => t.name);
    const undated = byId(visitMap(names, null)).get("same-day")!;
    expect(undated.current).toBe(0);
    const visits = new Map<string, string | null>([
      ...names.slice(0, 5).map((n) => [n, "2026-07-09"] as const),
      [names[5], "2026-07-10"],
    ]);
    const sameDay = byId(visits).get("same-day")!;
    expect(sameDay.current).toBe(5);
    expect(sameDay.unlocked).toBe(true);
  });
});
