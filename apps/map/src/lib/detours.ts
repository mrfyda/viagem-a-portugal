import type { FeatureCollection, Point } from "geojson";

import detoursData from "../data/detours.json";
import { stripDraftMarkers } from "./format";

/**
 * A Detour (ADR 0010): a real place visited on the retracing that has no entry
 * in the book's index — off Saramago's route, often postdating his 1979
 * journey. Display-only: never a Stop, never on a Route, not Visit-able.
 * Authored in blog-post front matter and generated into detours.json by
 * tools/blog-sync.
 */
export interface Detour {
  name: string;
  lat: number;
  lon: number;
  note: string | null;
  image: string | null;
  postUrl: string;
  postTitle: string;
}

export const detours: Detour[] = (detoursData as Detour[]).map((d) => ({
  ...d,
  postTitle: stripDraftMarkers(d.postTitle),
  note: d.note && stripDraftMarkers(d.note),
}));

/** URL-safe slug for the `?detour=` param, e.g. "Mazouco" -> "mazouco". */
export function detourSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const bySlug = new Map(detours.map((d) => [detourSlug(d.name), d]));

export function detourBySlug(slug: string): Detour | undefined {
  return bySlug.get(slug);
}

/** Recentre target when a Detour is selected (deep link, click, back/forward). */
export function detourCenter(slug: string): [number, number] | undefined {
  const d = bySlug.get(slug);
  return d ? [d.lon, d.lat] : undefined;
}

export const detoursGeoJson: FeatureCollection<
  Point,
  { slug: string; name: string }
> = {
  type: "FeatureCollection",
  features: detours.map((d) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [d.lon, d.lat] },
    properties: { slug: detourSlug(d.name), name: d.name },
  })),
};
