/**
 * URL-driven navigation for the web build: the current selection lives in a
 * query param so it is deep-linkable, survives a refresh, and rides the
 * browser's back/forward history. A book Place uses `?place=<indexName>`; a
 * Detour (ADR 0010) uses `?detour=<slug>`. The two are mutually exclusive —
 * writing one clears the other, so there is always a single selection.
 */

const PLACE = "place";
const DETOUR = "detour";

function read(param: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(param);
  } catch {
    return null;
  }
}

export const readPlaceParam = (): string | null => read(PLACE);
export const readDetourParam = (): string | null => read(DETOUR);

// Single selection: clear both params, then set the one being written.
function writeSelection(param: string | null, value: string | null): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(PLACE);
    url.searchParams.delete(DETOUR);
    if (param && value) url.searchParams.set(param, value);
    if (url.href !== window.location.href) {
      window.history.pushState(null, "", url);
    }
  } catch {
    // history API unavailable — selection just won't be reflected in the URL
  }
}

export const writePlaceParam = (place: string | null): void =>
  writeSelection(place ? PLACE : null, place);
export const writeDetourParam = (detour: string | null): void =>
  writeSelection(detour ? DETOUR : null, detour);

/** Fires on back/forward (popstate); the caller re-reads both params. */
export function subscribeSelectionParams(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}
