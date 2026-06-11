import { describe, expect, it } from "vitest";

import { bookPlaces } from "../book";
import {
  decodeJourney,
  deserializeVisits,
  encodeJourney,
  journeyMetrics,
  serializeVisits,
} from "../progress";

describe("journey share code", () => {
  it("roundtrips arbitrary visited sets", () => {
    const samples = [
      new Set<string>(),
      new Set([bookPlaces[0].indexName]),
      new Set([bookPlaces.at(-1)!.indexName]),
      new Set(bookPlaces.filter((_, i) => i % 7 === 0).map((p) => p.indexName)),
      new Set(bookPlaces.map((p) => p.indexName)),
    ];
    for (const visited of samples) {
      expect(decodeJourney(encodeJourney(visited))).toEqual(visited);
    }
  });

  it("rejects unknown versions and garbage", () => {
    expect(decodeJourney("2.AAAA")).toBeNull();
    expect(decodeJourney("nonsense")).toBeNull();
    expect(decodeJourney("1.!!!")).toBeNull();
  });

  it("ignores names that are not index places", () => {
    const decoded = decodeJourney(encodeJourney(new Set(["Atlantis"])));
    expect(decoded).toEqual(new Set());
  });
});

describe("visits storage format", () => {
  it("roundtrips v2 with dates and nulls", () => {
    const visits = new Map<string, string | null>([
      ["Bragança", "2024-09-15"],
      ["Chaves", null],
    ]);
    expect(deserializeVisits(serializeVisits(visits))).toEqual(visits);
  });

  it("migrates v1 share-code storage to dateless visits", () => {
    const legacy = encodeJourney(new Set(["Bragança", "Chaves"]));
    expect(deserializeVisits(legacy)).toEqual(
      new Map([
        ["Bragança", null],
        ["Chaves", null],
      ]),
    );
  });

  it("returns null for corrupt payloads", () => {
    expect(deserializeVisits("{broken")).toBeNull();
    expect(deserializeVisits('{"v":1,"visits":{}}')).toBeNull();
  });
});

describe("journey metrics", () => {
  it("counts pages of visited places", () => {
    const towns = [{ name: "Bragança" }, { name: "Chaves" }];
    const m = journeyMetrics(new Set(["Bragança"]), towns);
    expect(m.townsVisited).toBe(1);
    expect(m.townsTotal).toBe(2);
    const braganca = bookPlaces.find((p) => p.indexName === "Bragança")!;
    expect(m.pagesVisited).toBe(new Set(braganca.pages).size);
    expect(m.pagesTotal).toBeGreaterThan(300);
  });
});
