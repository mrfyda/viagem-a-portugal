import { useCallback, useEffect, useRef, useState } from "react";

import { towns } from "../lib/geo";
import {
  deserializeVisits,
  journeyMetrics,
  serializeVisits,
  type Visits,
} from "../lib/progress";
import { loadValue, saveValue } from "../lib/storage";
import { supabase } from "../lib/supabase";
import {
  applyOutbox,
  deserializeOutbox,
  fetchVisits,
  pushOutbox,
  serializeOutbox,
  type Outbox,
  type PendingChange,
} from "../lib/sync";

// Both are per-account: keys are suffixed with the Traveler's user id, so
// switching accounts on one device never mixes journeys.
const CACHE_KEY = "viagem-a-portugal/journey-cache";
const OUTBOX_KEY = "viagem-a-portugal/outbox";

/**
 * The signed-in Traveler's visit log: the server's log overlaid with the
 * local outbox (docs/adr/0009). Signed out (`userId` null) everything is
 * empty and mutations are no-ops — actions require an account.
 */
export function useProgress(userId: string | null) {
  const [serverLog, setServerLog] = useState<Visits>(new Map());
  const [outbox, setOutbox] = useState<Outbox>(new Map());
  const hydrated = useRef(false);
  const flushing = useRef(false);
  const outboxRef = useRef(outbox);
  outboxRef.current = outbox;

  const flush = useCallback(async () => {
    if (!userId || !supabase || flushing.current) return;
    const snapshot = outboxRef.current;
    if (snapshot.size === 0) return;
    flushing.current = true;
    try {
      await pushOutbox(supabase, userId, snapshot);
      setServerLog((log) => applyOutbox(log, snapshot));
      // only clear entries the Traveler hasn't touched again mid-push
      setOutbox((current) => {
        const next = new Map(current);
        for (const [place, change] of snapshot) {
          if (next.get(place) === change) next.delete(place);
        }
        return next;
      });
    } catch {
      // offline or Supabase unreachable — the outbox replays later
    } finally {
      flushing.current = false;
    }
  }, [userId]);

  // Hydrate per account: cached log and persisted outbox first (so a cold
  // start offline still shows the journey), then refresh from the server
  // and replay whatever is pending.
  useEffect(() => {
    hydrated.current = false;
    setServerLog(new Map());
    setOutbox(new Map());
    if (!userId) return;
    let cancelled = false;
    Promise.all([
      loadValue(`${CACHE_KEY}/${userId}`),
      loadValue(`${OUTBOX_KEY}/${userId}`),
    ]).then(async ([rawCache, rawOutbox]) => {
      if (cancelled) return;
      const cached = rawCache ? deserializeVisits(rawCache) : null;
      if (cached) setServerLog(cached);
      const persisted = rawOutbox ? deserializeOutbox(rawOutbox) : null;
      // actions taken before hydration resolved win over the persisted outbox
      if (persisted) setOutbox((current) => new Map([...persisted, ...current]));
      hydrated.current = true;
      if (!supabase) return;
      try {
        const fresh = await fetchVisits(supabase);
        if (!cancelled) setServerLog(fresh);
      } catch {
        // offline cold start — the cached log and outbox carry the session
      }
      void flush();
    });
    return () => {
      cancelled = true;
    };
  }, [userId, flush]);

  useEffect(() => {
    if (!userId || !hydrated.current) return;
    saveValue(`${OUTBOX_KEY}/${userId}`, serializeOutbox(outbox));
  }, [outbox, userId]);

  useEffect(() => {
    if (!userId || !hydrated.current) return;
    saveValue(`${CACHE_KEY}/${userId}`, serializeVisits(serverLog));
  }, [serverLog, userId]);

  // replay whenever something is pending (each new action retries the push)
  useEffect(() => {
    if (outbox.size > 0) void flush();
  }, [outbox, flush]);

  // ... and when the network comes back (web; native retries on action/load)
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function")
      return;
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flush]);

  const enqueue = useCallback(
    (place: string, change: PendingChange) => {
      if (!userId) return;
      setOutbox((current) => new Map(current).set(place, change));
    },
    [userId],
  );

  const visits = applyOutbox(serverLog, outbox);

  /**
   * Mark a town visited (date unknown until the Traveler fills it in), or
   * unmark it if it already is.
   */
  const toggle = (name: string) =>
    visits.has(name) ? enqueue(name, "unmark") : enqueue(name, { visitedOn: null });

  const setVisitDate = (name: string, date: string | null) => {
    if (visits.has(name)) enqueue(name, { visitedOn: date });
  };

  const visited = new Set(visits.keys());

  return {
    visits: visits as Visits,
    visited,
    toggle,
    setVisitDate,
    metrics: journeyMetrics(visited, towns),
  };
}
