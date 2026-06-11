import { bookPlaceByName, bookPlaces } from "./book";

/**
 * Visited places are tracked by indexName and serialized as a compact,
 * shareable code: a bitmask over the canonical (alphabetical) order of the
 * book's index places, base64url-encoded, with a format-version prefix.
 */

const CODE_VERSION = "1";

// canonical bit order — bookPlaces is sorted by indexName at generation time
const PLACE_ORDER = bookPlaces.map((place) => place.indexName);
const BIT_BY_NAME = new Map(PLACE_ORDER.map((name, i) => [name, i]));

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function encodeJourney(visited: ReadonlySet<string>): string {
  const bytes = new Uint8Array(Math.ceil(PLACE_ORDER.length / 8));
  for (const name of visited) {
    const bit = BIT_BY_NAME.get(name);
    if (bit === undefined) continue;
    bytes[bit >> 3] |= 1 << (bit & 7);
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += BASE64URL[(n >> 18) & 63] + BASE64URL[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += BASE64URL[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += BASE64URL[n & 63];
  }
  return `${CODE_VERSION}.${out}`;
}

export function decodeJourney(code: string): Set<string> | null {
  const dot = code.indexOf(".");
  if (dot === -1 || code.slice(0, dot) !== CODE_VERSION) return null;
  const body = code.slice(dot + 1);

  const bytes = new Uint8Array(Math.ceil(PLACE_ORDER.length / 8));
  let bytePos = 0;
  for (let i = 0; i < body.length; i += 4) {
    let n = 0;
    let chars = 0;
    for (; chars < 4 && i + chars < body.length; chars++) {
      const v = BASE64URL.indexOf(body[i + chars]);
      if (v === -1) return null;
      n = (n << 6) | v;
    }
    n <<= 6 * (4 - chars);
    for (let b = 0; b < chars - 1 && bytePos < bytes.length; b++) {
      bytes[bytePos++] = (n >> (16 - 8 * b)) & 0xff;
    }
  }

  const visited = new Set<string>();
  PLACE_ORDER.forEach((name, bit) => {
    if (bytes[bit >> 3] & (1 << (bit & 7))) visited.add(name);
  });
  return visited;
}

/**
 * A visit log: place indexName -> ISO date (YYYY-MM-DD) it was visited, or
 * null when the date is unknown (e.g. imported from a share code, which
 * only carries the boolean bitmask — visit dates stay on your device).
 */
export type Visits = ReadonlyMap<string, string | null>;

export function serializeVisits(visits: Visits): string {
  return JSON.stringify({ v: 2, visits: Object.fromEntries(visits) });
}

export function deserializeVisits(raw: string): Map<string, string | null> | null {
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.v !== 2 || typeof parsed.visits !== "object") return null;
      return new Map(Object.entries(parsed.visits as Record<string, string | null>));
    } catch {
      return null;
    }
  }
  // v1 storage held the share code itself: visited names, no dates
  const legacy = decodeJourney(raw);
  return legacy ? new Map([...legacy].map((name) => [name, null])) : null;
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
