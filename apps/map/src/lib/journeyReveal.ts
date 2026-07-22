import type { FeatureCollection, LineString } from "geojson";

/**
 * Pure geometry for the journey-reveal loading animation
 * (JourneyRevealOverlay): the loading ring's six chapter-colored arcs morph
 * into the six chapter Routes. Both shapes are resampled to the same number
 * of evenly spaced points, so the morph is a pointwise interpolation — the
 * final frame *is* the route geometry, which is what makes the hand-off to
 * the maplibre routes layer seamless.
 */

export type Pt = [number, number];

/** n points along a circular arc, from startDeg sweeping sweepDeg clockwise
 * (SVG screen coordinates: y grows downward, 0° points right). */
export function arcPoints(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  sweepDeg: number,
  n: number,
): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((startDeg + (sweepDeg * i) / (n - 1)) * Math.PI) / 180;
    points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return points;
}

/** Resample a polyline to n points evenly spaced by arc length. Endpoints
 * are preserved exactly; degenerate inputs (a single point, zero length)
 * collapse to n copies of the first point. */
export function resamplePolyline(points: Pt[], n: number): Pt[] {
  if (points.length === 0 || n < 2)
    return Array.from({ length: n }, () => points[0] ?? [0, 0]);
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }
  const total = cumulative[cumulative.length - 1];
  if (total === 0) return Array.from({ length: n }, () => points[0]);

  const out: Pt[] = [];
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const target = (total * i) / (n - 1);
    while (seg < points.length - 2 && cumulative[seg + 1] < target) seg++;
    const span = cumulative[seg + 1] - cumulative[seg];
    const t = span === 0 ? 0 : (target - cumulative[seg]) / span;
    out.push([
      points[seg][0] + (points[seg + 1][0] - points[seg][0]) * t,
      points[seg][1] + (points[seg + 1][1] - points[seg][1]) * t,
    ]);
  }
  return out;
}

/** Pointwise interpolation between two same-length polylines. */
export function lerpPolylines(a: Pt[], b: Pt[], t: number): Pt[] {
  return a.map((p, i) => [
    p[0] + (b[i][0] - p[0]) * t,
    p[1] + (b[i][1] - p[1]) * t,
  ]);
}

/** Return `a` in whichever direction lerps to `target` with less total
 * travel — a reversed source avoids the morph twisting over itself. */
export function orientToMatch(a: Pt[], target: Pt[]): Pt[] {
  let forward = 0;
  let reverse = 0;
  const last = a.length - 1;
  for (let i = 0; i < a.length; i++) {
    forward += Math.hypot(a[i][0] - target[i][0], a[i][1] - target[i][1]);
    reverse += Math.hypot(
      a[last - i][0] - target[i][0],
      a[last - i][1] - target[i][1],
    );
  }
  return reverse < forward ? [...a].reverse() : a;
}

/** Polyline as an SVG path `d` (rounded to tenths — subpixel is plenty). */
export function toSvgPath(points: Pt[]): string {
  if (points.length === 0) return "";
  const fmt = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return `M ${fmt(points[0])} L ${points.slice(1).map(fmt).join(" L ")}`;
}

/**
 * One continuous polyline per chapter, from the per-segment Route features:
 * segments ordered by `ordinal` and concatenated (dropping each joint's
 * duplicated point). Returns lng/lat — the caller projects to screen space.
 */
export function chapterPolylines(
  routes: FeatureCollection<LineString, { chapter: number; ordinal: number }>,
): Map<number, Pt[]> {
  const byChapter = new Map<number, Pt[]>();
  const features = [...routes.features].sort(
    (a, b) => a.properties.ordinal - b.properties.ordinal,
  );
  for (const feature of features) {
    const line = byChapter.get(feature.properties.chapter) ?? [];
    for (const coord of feature.geometry.coordinates) {
      const p: Pt = [coord[0], coord[1]];
      const prev = line[line.length - 1];
      if (prev && prev[0] === p[0] && prev[1] === p[1]) continue;
      line.push(p);
    }
    byChapter.set(feature.properties.chapter, line);
  }
  return byChapter;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
