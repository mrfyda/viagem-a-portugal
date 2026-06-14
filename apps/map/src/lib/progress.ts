import { bookPlaceByName, bookPlaces } from "./book";

/**
 * A visit log: place indexName -> ISO date (YYYY-MM-DD) it was visited, or
 * null when the date is unknown. The log is persisted as versioned JSON in
 * localStorage / AsyncStorage so it survives across sessions; visit dates
 * stay on the traveler's own device.
 */
export type Visits = ReadonlyMap<string, string | null>;

const STORAGE_VERSION = 2;

export function serializeVisits(visits: Visits): string {
  return JSON.stringify({ v: STORAGE_VERSION, visits: Object.fromEntries(visits) });
}

export function deserializeVisits(raw: string): Map<string, string | null> | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.v !== STORAGE_VERSION || typeof parsed.visits !== "object") return null;
    return new Map(Object.entries(parsed.visits as Record<string, string | null>));
  } catch {
    return null;
  }
}

const ALL_PAGES = new Set(bookPlaces.flatMap((place) => place.pages));

export interface JourneyMetrics {
  townsVisited: number;
  townsTotal: number;
  pagesVisited: number;
  pagesTotal: number;
}

/**
 * Progress over the mappable towns and over the distinct book pages those
 * places appear on ("I have traveled N of M pages").
 */
export function journeyMetrics(
  visited: ReadonlySet<string>,
  mappableTowns: readonly { name: string }[],
): JourneyMetrics {
  const pagesVisited = new Set<number>();
  for (const name of visited) {
    for (const page of bookPlaceByName.get(name)?.pages ?? []) {
      pagesVisited.add(page);
    }
  }
  const mappable = new Set(mappableTowns.map((t) => t.name));
  return {
    townsVisited: [...visited].filter((name) => mappable.has(name)).length,
    townsTotal: mappable.size,
    pagesVisited: pagesVisited.size,
    pagesTotal: ALL_PAGES.size,
  };
}
