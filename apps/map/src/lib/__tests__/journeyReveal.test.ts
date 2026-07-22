import type { FeatureCollection, LineString } from "geojson";
import { describe, expect, it } from "vitest";

import {
  arcPoints,
  chapterPolylines,
  easeInOutCubic,
  lerpPolylines,
  orientToMatch,
  resamplePolyline,
  toSvgPath,
  type Pt,
} from "../journeyReveal";

describe("arcPoints", () => {
  it("starts and ends on the requested angles", () => {
    const pts = arcPoints(0, 0, 10, 0, 90, 5);
    expect(pts[0][0]).toBeCloseTo(10);
    expect(pts[0][1]).toBeCloseTo(0);
    expect(pts[4][0]).toBeCloseTo(0);
    expect(pts[4][1]).toBeCloseTo(10); // 90° is downward in screen coords
  });

  it("keeps every point on the circle", () => {
    for (const [x, y] of arcPoints(3, 4, 26, -90, 48, 40))
      expect(Math.hypot(x - 3, y - 4)).toBeCloseTo(26);
  });
});

describe("resamplePolyline", () => {
  it("preserves endpoints exactly", () => {
    const line: Pt[] = [
      [0, 0],
      [3, 7],
      [10, 10],
    ];
    const out = resamplePolyline(line, 9);
    expect(out[0]).toEqual([0, 0]);
    expect(out[8]).toEqual([10, 10]);
  });

  it("spaces points evenly by arc length", () => {
    const out = resamplePolyline(
      [
        [0, 0],
        [10, 0],
      ],
      6,
    );
    expect(out.map(([x]) => x)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it("walks corners without losing length", () => {
    // L-shape: two 10-long legs; midpoint of the resample sits on the corner.
    const out = resamplePolyline(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      5,
    );
    expect(out[2]).toEqual([10, 0]);
    expect(out[3]).toEqual([10, 5]);
  });

  it("collapses degenerate input to copies of the first point", () => {
    expect(resamplePolyline([[4, 2]], 3)).toEqual([
      [4, 2],
      [4, 2],
      [4, 2],
    ]);
  });
});

describe("lerpPolylines", () => {
  const a: Pt[] = [
    [0, 0],
    [10, 0],
  ];
  const b: Pt[] = [
    [0, 10],
    [10, 10],
  ];

  it("returns the source at t=0 and the target at t=1", () => {
    expect(lerpPolylines(a, b, 0)).toEqual(a);
    expect(lerpPolylines(a, b, 1)).toEqual(b);
  });

  it("interpolates pointwise", () => {
    expect(lerpPolylines(a, b, 0.5)).toEqual([
      [0, 5],
      [10, 5],
    ]);
  });
});

describe("orientToMatch", () => {
  it("reverses the source when that shortens the travel", () => {
    const source: Pt[] = [
      [0, 0],
      [10, 0],
    ];
    const target: Pt[] = [
      [10, 100],
      [0, 100],
    ];
    expect(orientToMatch(source, target)).toEqual([
      [10, 0],
      [0, 0],
    ]);
  });

  it("keeps the source direction when it already matches", () => {
    const source: Pt[] = [
      [0, 0],
      [10, 0],
    ];
    const target: Pt[] = [
      [0, 100],
      [10, 100],
    ];
    expect(orientToMatch(source, target)).toEqual(source);
  });
});

describe("toSvgPath", () => {
  it("renders M/L commands rounded to tenths", () => {
    expect(
      toSvgPath([
        [1.234, 5.678],
        [9, 10],
      ]),
    ).toBe("M 1.2 5.7 L 9.0 10.0");
  });

  it("returns an empty string for no points", () => {
    expect(toSvgPath([])).toBe("");
  });
});

describe("chapterPolylines", () => {
  const routes: FeatureCollection<
    LineString,
    { chapter: number; ordinal: number }
  > = {
    type: "FeatureCollection",
    features: [
      // Deliberately out of ordinal order, with a duplicated joint point.
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [2, 2],
          ],
        },
        properties: { chapter: 1, ordinal: 3 },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        properties: { chapter: 1, ordinal: 2 },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [5, 5],
            [6, 6],
          ],
        },
        properties: { chapter: 2, ordinal: 10 },
      },
    ],
  };

  it("orders segments by ordinal and drops duplicated joints", () => {
    const lines = chapterPolylines(routes);
    expect(lines.get(1)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
    expect(lines.get(2)).toEqual([
      [5, 5],
      [6, 6],
    ]);
  });
});

describe("easeInOutCubic", () => {
  it("pins the endpoints and centre", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });
});
