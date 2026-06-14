/**
 * Native stub for the web's URL-driven navigation. There is no address bar to
 * deep-link into, so selection stays in component state. Kept as a separate
 * platform file so the hook can import one module unconditionally.
 */

export function readPlaceParam(): string | null {
  return null;
}

export function readDetourParam(): string | null {
  return null;
}

export function writePlaceParam(_place: string | null): void {}

export function writeDetourParam(_detour: string | null): void {}

export function subscribeSelectionParams(_onChange: () => void): () => void {
  return () => {};
}
