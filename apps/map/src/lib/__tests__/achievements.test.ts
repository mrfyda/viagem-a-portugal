import { describe, expect, it } from "vitest";

import { achievements, chapterStopPlaces } from "../achievements";
import { chapters } from "../book";
import { towns } from "../geo";

const byId = (visited: ReadonlySet<string>) =>
  new Map(achievements(visited).map((a) => [a.id, a]));

describe("achievements", () => {
  it("starts fully locked with zero progress", () => {
    for (const a of achievements(new Set())) {
      expect(a.unlocked, a.id).toBe(false);
      expect(a.current, a.id).toBe(0);
      expect(a.target, a.id).toBeGreaterThan(0);
    }
  });

  it("unlocks the first stop on a single mappable visit", () => {
    const first = byId(new Set([towns[0].name])).get("first-stop")!;
    expect(first.unlocked).toBe(true);
    expect(first.current).toBe(1);
  });

  it("ignores visits to places without a marker", () => {
    const all = achievements(new Set(["not a real place"]));
    expect(all.every((a) => a.current === 0)).toBe(true);
  });

  it("clamps tally progress at the target", () => {
    const visited = new Set(towns.slice(0, 30).map((t) => t.name));
    const ten = byId(visited).get("towns-10")!;
    expect(ten.current).toBe(10);
    expect(ten.unlocked).toBe(true);
  });

  it("completes a chapter when every one of its stops is visited", () => {
    const places = chapterStopPlaces(1);
    expect(places.size).toBeGreaterThan(0);
    const all = byId(new Set(places));
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
    const visited = new Set(
      chapters.flatMap((c) => [...chapterStopPlaces(c.number)]),
    );
    const all = byId(visited);
    for (const c of chapters) {
      expect(all.get(`chapter-${c.number}`)!.unlocked, `chapter ${c.number}`).toBe(true);
    }
    expect(all.get("full-journey")!.unlocked).toBe(true);
  });

  it("carries interpolation vars for every key", () => {
    for (const a of achievements(new Set())) {
      // Chapter rows label themselves with the book's chapter title.
      if (a.chapter != null) expect(a.vars.title).toBeTruthy();
    }
  });
});
