/**
 * URL-driven navigation for the web build: the selected Place lives in a
 * `?place=<indexName>` query param so it is deep-linkable, survives a
 * refresh, and rides the browser's back/forward history. Copying the URL is
 * the way to share a journey view.
 */

const PARAM = "place";

export function readPlaceParam(): string | null {
  try {
    return new URLSearchParams(window.location.search).get(PARAM);
  } catch {
    return null;
  }
}

export function writePlaceParam(place: string | null): void {
  try {
    const url = new URL(window.location.href);
    if (place) url.searchParams.set(PARAM, place);
    else url.searchParams.delete(PARAM);
    if (url.href !== window.location.href) {
      window.history.pushState(null, "", url);
    }
  } catch {
    // history API unavailable — selection just won't be reflected in the URL
  }
}

/** Fires on back/forward (popstate) with the param's new value. */
export function subscribePlaceParam(
  onChange: (place: string | null) => void,
): () => void {
  const handler = () => onChange(readPlaceParam());
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}
