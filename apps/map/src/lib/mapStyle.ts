import type {
  ExpressionSpecification,
  StyleSpecification,
} from "maplibre-gl";

import { MAP_STYLE_URL } from "./geo";

// Mirrors --color-primary (hsl(156 80% 20%)) so the map's "visited" green is
// the same green as the UI — maplibre paint needs a hex literal, hence the
// duplication. UNVISITED matches the amber town-dot default.
export const VISITED_COLOR = "#0a5c3b";
export const UNVISITED_COLOR = "#b45309";

/**
 * One color per chapter Route, north to south. Picked for mutual distinctness
 * (esp. adjacent chapters 4 vs 5 — red vs blue) and to stay clear of the
 * amber town dots (UNVISITED_COLOR) and green visited dots.
 */
export const CHAPTER_COLORS: Record<number, string> = {
  1: "#ea580c", // orange
  2: "#0d9488", // teal
  3: "#7c3aed", // violet
  4: "#dc2626", // red
  5: "#2563eb", // blue
  6: "#db2777", // pink
};

// Detour markers (ADR 0010): a solid slate dot with a white ring — the same dot
// family as the book places, but a neutral colour outside the amber/green and
// chapter palette, so an off-book place reads as a place apart.
export const DETOUR_COLOR = "#64748b"; // slate-500

export const ROUTE_COLOR: ExpressionSpecification = [
  "match",
  ["get", "chapter"],
  1, CHAPTER_COLORS[1],
  2, CHAPTER_COLORS[2],
  3, CHAPTER_COLORS[3],
  4, CHAPTER_COLORS[4],
  5, CHAPTER_COLORS[5],
  6, CHAPTER_COLORS[6],
  UNVISITED_COLOR,
];

/**
 * Smallest marker radius — bumped up from 4 so 1-page villages stay tappable on
 * mobile. Also the fixed size of Detour markers, so an off-book point matches
 * the smallest book dot.
 */
export const MARKER_MIN_RADIUS = 7;

/**
 * Pin radius scaled by how often the place appears in the book: 1-page
 * villages stay at the minimum, Lisboa/Peniche-grade stops stand out. Visited
 * towns get a small extra bump.
 */
const TOWN_BASE_RADIUS: ExpressionSpecification = [
  "+",
  [
    "interpolate",
    ["linear"],
    ["get", "mentions"],
    1, MARKER_MIN_RADIUS,
    4, MARKER_MIN_RADIUS + 2,
    10, MARKER_MIN_RADIUS + 4,
    56, MARKER_MIN_RADIUS + 8,
  ],
  ["case", ["get", "visited"], 1, 0],
];

/**
 * 1 for dots whose disclosure tier (geo.ts) is revealed, else 0; the "none"
 * rung reveals nothing.
 */
const revealed = (
  tiers: number[] | "none",
): ExpressionSpecification | number =>
  tiers === "none" ? 0 : ["match", ["get", "tier"], tiers, 1, 0];

/**
 * Zoom-graduated disclosure ("the map is the document", not pin-soup): the
 * opening country view — and anything wider — is pure line-work, the six
 * routes alone. Zooming in past it, the anchor Stops (and a Traveler's
 * visited places, which geo.ts promotes to tier 0) fade in first; the
 * remaining Stops, the passed-through places and finally the referenced-only
 * places grow in over roughly one zoom level each as the reader moves
 * closer. The country fit lands at z6.1–6.45 depending on viewport (phone to
 * desktop), so the first rung starts safely above it at z6.6. The zoom
 * envelope multiplies the base value per rung, so a dot fades/scales
 * smoothly and, at radius 0, is not hit-testable.
 */
const disclosureEnvelope = (
  value: (tiers: number[] | "none") => ExpressionSpecification | number,
): ExpressionSpecification => [
  "interpolate",
  ["linear"],
  ["zoom"],
  6.6, value("none"),
  7.2, value([0]),
  7.4, value([0]),
  8.0, value([0, 1]),
  8.2, value([0, 1]),
  8.8, value([0, 1, 2]),
  9.2, value([0, 1, 2]),
  9.9, value([0, 1, 2, 3]),
];

export const TOWN_RADIUS: ExpressionSpecification = disclosureEnvelope(
  (tiers) => ["*", TOWN_BASE_RADIUS, revealed(tiers)],
);

/**
 * Referenced-only places stay slightly quieter even once revealed; `dim`
 * fades dots while something else holds the stage — a plain number while a
 * selection is active (the selected dot lives on its own always-on layers),
 * or a per-feature expression while a chapter is focused.
 */
export const townOpacity = (
  dim: number | ExpressionSpecification = 1,
): ExpressionSpecification =>
  disclosureEnvelope((tiers) => [
    "*",
    dim,
    ["match", ["get", "tier"], 3, 0.8, 1],
    revealed(tiers),
  ]);

export const townStrokeOpacity = (
  dim: number | ExpressionSpecification = 1,
): ExpressionSpecification =>
  disclosureEnvelope((tiers) => ["*", dim, revealed(tiers)]);

/** Chapter focus: the focused chapter's dots at full strength, the rest
 * stepped well back (referenced-only places carry chapter null → dimmed). */
export const chapterDim = (chapter: number): ExpressionSpecification => [
  "case",
  ["==", ["get", "chapter"], chapter],
  1,
  0.2,
];

/** Route opacity, focused variant emphasising one chapter's line. */
export const routeOpacity = (
  focusedChapter: number | null,
): number | ExpressionSpecification =>
  focusedChapter == null
    ? 0.75
    : ["case", ["==", ["get", "chapter"], focusedChapter], 0.9, 0.15];

export const TOWN_OPACITY = townOpacity();
export const TOWN_STROKE_OPACITY = townStrokeOpacity();

/**
 * The selected Place on the canvas: the dot itself, slightly bumped, plus an
 * ink ring around it. Ink (not the visited green) so selection never reads
 * as "visited". Independent of disclosure — a Place picked via search or a
 * deep link shows even below its tier's zoom.
 */
export const SELECTION_RING_COLOR = "#1c1917"; // --color-foreground
export const SELECTED_DOT_RADIUS: ExpressionSpecification = [
  "+",
  TOWN_BASE_RADIUS,
  1.5,
];
export const SELECTED_HALO_RADIUS: ExpressionSpecification = [
  "+",
  TOWN_BASE_RADIUS,
  7,
];

/**
 * The zoom at which a tier's dots become interactive — the midpoint of the
 * disclosure fade above. A radius-0 circle still hit-tests at its centre, so
 * click/hover handlers must drop features below their tier's zoom or hidden
 * dots ghost-click.
 */
export const TIER_INTERACTIVE_ZOOM: Record<number, number> = {
  0: 6.9,
  1: 7.7,
  2: 8.5,
  3: 9.55,
};

/**
 * Invisible hit-target layers (web): a near-transparent circle drawn over
 * each dot, larger than the visible marker, so hover/tap targets stay
 * comfortable even for 1-page villages — queryRenderedFeatures only sees
 * painted circles, so the target must actually render. Flat by zoom (not
 * mention-scaled): every place deserves the same finger. Disclosure still
 * applies — handlers must filter by TIER_INTERACTIVE_ZOOM, exactly as with
 * the visible dots.
 */
export const TOWN_HIT_RADIUS: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  6.6, 10,
  9, 14,
  12, 18,
];

/** Same idea for Detour rings (fixed MARKER_MIN_RADIUS dots, minzoom 8). */
export const DETOUR_HIT_RADIUS: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  8, 12,
  12, 16,
];

export const TOWN_COLOR: ExpressionSpecification = [
  "case",
  ["get", "visited"],
  VISITED_COLOR,
  UNVISITED_COLOR,
];

/**
 * Liberty only gives railways line-width from zoom 14, so they are invisible
 * at travel-planning zooms. Widen and start them much earlier.
 */
function boostRailVisibility(style: StyleSpecification): StyleSpecification {
  for (const layer of style.layers) {
    if (layer.type !== "line" || !layer.id.endsWith("_rail")) continue;
    layer.paint = {
      ...layer.paint,
      "line-color": "#9b9b9b",
      "line-width": [
        "interpolate",
        ["exponential", 1.4],
        ["zoom"],
        7, 0.6,
        10, 1.2,
        14, 1.8,
        20, 3,
      ],
    };
  }
  return style;
}

export async function fetchMapStyle(): Promise<StyleSpecification> {
  // Time-bound so a hung request becomes the retry screen, not an eternal
  // loading spinner. (Guarded: AbortSignal.timeout is missing on some
  // native JS engines.)
  const signal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(15000)
      : undefined;
  const response = await fetch(MAP_STYLE_URL, { signal });
  if (!response.ok) throw new Error(`Map style request failed: ${response.status}`);
  return boostRailVisibility((await response.json()) as StyleSpecification);
}
