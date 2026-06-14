/**
 * Native stub for the web's URL-driven navigation. There is no address bar
 * to deep-link into, so selection stays in component state. Kept as a
 * separate platform file so the hook can import one module unconditionally.
 */

export function readPlaceParam(): string | null {
  return null;
}

export function writePlaceParam(_place: string | null): void {}

export function subscribePlaceParam(
  _onChange: (place: string | null) => void,
): () => void {
  return () => {};
}
