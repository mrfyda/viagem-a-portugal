import { useCallback, useEffect, useState } from "react";

import { detourBySlug } from "../lib/detours";
import { towns } from "../lib/geo";
import { applySelectionToHead } from "../lib/head";
import {
  readDetourParam,
  readPlaceParam,
  subscribeSelectionParams,
  writeDetourParam,
  writePlaceParam,
} from "../lib/location";

export type Selection =
  | { kind: "place"; id: string }
  | { kind: "detour"; slug: string }
  | null;

// A Place is selectable iff it has a rendered marker — every dot the user can
// click. This is the towns set (toponymic-index Places plus split homonym
// referents like "Lagoa de Óbidos" that live in corrections.json, not the
// index), and it excludes un-geocoded (0,0) Places that have no dot.
const selectablePlaces = new Set(towns.map((t) => t.name));

/** Read the current selection from the URL, ignoring stale/invalid links. */
function fromUrl(): Selection {
  const place = readPlaceParam();
  if (place && selectablePlaces.has(place)) return { kind: "place", id: place };
  const detour = readDetourParam();
  if (detour && detourBySlug(detour)) return { kind: "detour", slug: detour };
  return null;
}

/**
 * The current map selection — a book Place or a Detour — kept in sync with the
 * URL on web (deep-linkable, back/forward). On native the location module is a
 * no-op stub, so this is plain component state. The two kinds are mutually
 * exclusive: selecting one clears the other.
 */
export function useSelection() {
  const [selection, setSelection] = useState<Selection>(fromUrl);

  useEffect(() => subscribeSelectionParams(() => setSelection(fromUrl())), []);

  // Keep the document title and description/OG meta in step with the selection
  // (web only; the native module is a no-op).
  useEffect(() => applySelectionToHead(selection), [selection]);

  const selectPlace = useCallback((id: string | null) => {
    const valid = id && selectablePlaces.has(id) ? id : null;
    setSelection(valid ? { kind: "place", id: valid } : null);
    writePlaceParam(valid);
  }, []);

  const selectDetour = useCallback((slug: string | null) => {
    const valid = slug && detourBySlug(slug) ? slug : null;
    setSelection(valid ? { kind: "detour", slug: valid } : null);
    writeDetourParam(valid);
  }, []);

  const clear = useCallback(() => {
    setSelection(null);
    writePlaceParam(null);
  }, []);

  return { selection, selectPlace, selectDetour, clear };
}
