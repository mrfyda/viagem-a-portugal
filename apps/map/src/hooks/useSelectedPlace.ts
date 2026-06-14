import { useCallback, useEffect, useState } from "react";

import { bookPlaceByName } from "../lib/book";
import {
  readPlaceParam,
  subscribePlaceParam,
  writePlaceParam,
} from "../lib/location";

/** Only accept a param that names a real index Place; ignore stale links. */
const validate = (place: string | null) =>
  place && bookPlaceByName.has(place) ? place : null;

/**
 * The currently selected Place, kept in sync with the URL (web) so the view
 * is deep-linkable and rides browser back/forward. On native this is plain
 * component state (the location module is a no-op stub).
 */
export function useSelectedPlace() {
  const [place, setPlaceState] = useState<string | null>(() =>
    validate(readPlaceParam()),
  );

  useEffect(
    () => subscribePlaceParam((next) => setPlaceState(validate(next))),
    [],
  );

  const setPlace = useCallback((next: string | null) => {
    const valid = validate(next);
    setPlaceState(valid);
    writePlaceParam(valid);
  }, []);

  return [place, setPlace] as const;
}
