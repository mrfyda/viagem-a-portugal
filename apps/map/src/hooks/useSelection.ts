import { useCallback, useEffect, useState } from "react";

import { bookPlaceByName } from "../lib/book";
import { detourBySlug } from "../lib/detours";
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

/** Read the current selection from the URL, ignoring stale/invalid links. */
function fromUrl(): Selection {
  const place = readPlaceParam();
  if (place && bookPlaceByName.has(place)) return { kind: "place", id: place };
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

  const selectPlace = useCallback((id: string | null) => {
    const valid = id && bookPlaceByName.has(id) ? id : null;
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
