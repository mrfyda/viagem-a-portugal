import { useEffect, useMemo, useSyncExternalStore } from "react";

import { towns } from "../lib/geo";
import { keyedStorage } from "../lib/keyedStorage";
import { journeyMetrics, type Visits } from "../lib/progress";
import { loadValue, saveValue } from "../lib/storage";
import { supabase } from "../lib/supabase";
import { createVisitStore } from "../lib/visitStore";
import { supabaseTransport } from "../lib/visitTransport";

/**
 * The signed-in Traveler's visit log: the server's log overlaid with the local
 * offline outbox (docs/adr/0009), owned by a VisitStore (src/lib/visitStore.ts).
 * Signed out (`userId` null) everything is empty and mutations are no-ops.
 *
 * The store owns *how* (hydrate, coalesce, flush, retry, teardown); the hook
 * owns *when* — it hydrates on mount and replays when the network returns —
 * and projects journey metrics over the overlay (metrics stay out of the store,
 * which never imports book/geo data).
 */
export function useProgress(userId: string | null) {
  // A fresh store per Traveler; the previous one is disposed on change. Per-
  // account isolation is structural — a store is bound to one userId for life.
  const store = useMemo(
    () =>
      createVisitStore({
        traveler: userId ? { userId } : null,
        transport: userId && supabase ? supabaseTransport(supabase, userId) : null,
        storage: keyedStorage(loadValue, saveValue, userId),
      }),
    [userId],
  );

  useEffect(() => {
    void store.hydrate();
    const hasDom =
      typeof window !== "undefined" && typeof window.addEventListener === "function";
    const onOnline = () => void store.flush();
    if (hasDom) window.addEventListener("online", onOnline);
    return () => {
      if (hasDom) window.removeEventListener("online", onOnline);
      store.dispose();
    };
  }, [store]);

  const { visits, pending } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const visited = useMemo(() => new Set(visits.keys()), [visits]);

  return {
    visits: visits as Visits,
    visited,
    pending,
    toggle: (name: string) =>
      visits.has(name) ? store.enqueue(name, "unmark") : store.enqueue(name, { visitedOn: null }),
    setVisitDate: (name: string, date: string | null) => {
      if (visits.has(name)) store.enqueue(name, { visitedOn: date });
    },
    metrics: journeyMetrics(visited, towns),
  };
}
