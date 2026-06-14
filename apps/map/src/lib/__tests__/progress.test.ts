import { describe, expect, it } from "vitest";

import { bookPlaces } from "../book";
import {
  deserializeVisits,
  journeyMetrics,
  serializeVisits,
} from "../progress";

describe("visits storage format", () => {
  it("roundtrips v2 with dates and nulls", () => {
    const visits = new Map<string, string | null>([
      ["Bragança", "2024-09-15"],
      ["Chaves", null],
    ]);
    expect(deserializeVisits(serializeVisits(visits))).toEqual(visits);
  });

  it("returns null for corrupt or unsupported payloads", () => {
    expect(deserializeVisits("{broken")).toBeNull();
    expect(deserializeVisits("nonsense")).toBeNull();
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
