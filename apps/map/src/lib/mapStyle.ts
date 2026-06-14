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
export const TOWN_RADIUS: ExpressionSpecification = [
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
  const response = await fetch(MAP_STYLE_URL);
  if (!response.ok) throw new Error(`Map style request failed: ${response.status}`);
  return boostRailVisibility((await response.json()) as StyleSpecification);
}
