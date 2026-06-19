import type { Visits } from "./progress";
import { applyOutbox, type Outbox, type PendingChange } from "./sync";

/**
 * The server round-trip for one signed-in Traveler's Visits (docs/adr/0007,
 * 0009). Bound to the Traveler at construction, so neither the Supabase client
 * nor the userId crosses this seam — the store stays free of `@supabase`.
 */
export interface VisitTransport {
  /** The Traveler's full Visit log as the server holds it. Rejects when offline. */
  fetch(): Promise<Visits>;
  /** Replay the outbox: upsert `{ visitedOn }` rows, delete "unmark"ed ones. */
  push(outbox: Outbox): Promise<void>;
}

/**
 * Per-account local persistence. The adapter owns the storage keys, the
 * `${key}/${userId}` suffix, and the versioned (de)serialization — the store
 * knows none of it, it just loads and saves whole Visits/Outbox values.
 */
export interface VisitStorage {
  loadCachedLog(): Promise<Visits | null>;
  saveCachedLog(log: Visits): Promise<void>;
  loadOutbox(): Promise<Outbox | null>;
  saveOutbox(outbox: Outbox): Promise<void>;
}

export interface VisitStoreConfig {
  /** `null` ⇒ signed out: empty, read-only, every mutation a no-op (ADR 0007). */
  traveler: { userId: string } | null;
  /** `null` ⇒ no Supabase config: local-only, `flush` a no-op (ADR 0007). */
  transport: VisitTransport | null;
  storage: VisitStorage;
}

/** What a consumer reads. Identity is stable until the state actually changes. */
export interface VisitSnapshot {
  /** The server log overlaid with the outbox — what this device believes is true. */
  readonly visits: Visits;
  /** True while the outbox holds an unsynced action. */
  readonly pending: boolean;
}

export interface VisitStore {
  /** The current overlay. Referentially stable between changes (useSyncExternalStore). */
  getSnapshot(): VisitSnapshot;
  subscribe(listener: () => void): () => void;
  /** Load cache + outbox, surface them, then refresh from the transport and flush. */
  hydrate(): Promise<void>;
  /** Queue one coalesced action for a Place and opportunistically flush. */
  enqueue(place: string, change: PendingChange): void;
  /** Replay the outbox once. Idempotent, dedupes in-flight, swallows offline. */
  flush(): Promise<void>;
  /** Cancel in-flight work; any later resolution writes nothing and notifies nobody. */
  dispose(): void;
}

const EMPTY: Visits = new Map();

/**
 * A signed-in Traveler's Visit lifecycle (docs/adr/0009), as a deep module the
 * React hook subscribes to. The store owns *how* — hydration ordering, the
 * server/outbox overlay, coalescing, in-flight flush dedupe, teardown — behind
 * a small interface; the platform owns *when* (mount, the network returning).
 * The pure outbox functions (applyOutbox, serialize/deserialize) are reused,
 * not reinvented; the Supabase and storage details live behind the two ports.
 */
export function createVisitStore(config: VisitStoreConfig): VisitStore {
  const { traveler, transport, storage } = config;

  let serverLog: Visits = EMPTY;
  const outbox = new Map<string, PendingChange>();
  let hydrated = false;
  let flushing = false;
  let disposed = false;
  // Bumped by dispose() and by each hydrate(); an async continuation whose
  // captured value is stale bails before touching state (teardown safety, and
  // a superseding fetch wins over an older one).
  let generation = 0;
  const listeners = new Set<() => void>();

  let snapshot: VisitSnapshot = { visits: EMPTY, pending: false };

  const commit = () => {
    snapshot = { visits: applyOutbox(serverLog, outbox), pending: outbox.size > 0 };
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const persistOutbox = () => {
    if (hydrated && traveler) void storage.saveOutbox(outbox);
  };
  const persistCache = () => {
    if (hydrated && traveler) void storage.saveCachedLog(serverLog);
  };

  const flush = async (): Promise<void> => {
    if (disposed || !traveler || !transport || flushing) return;
    const pushing = new Map(outbox);
    if (pushing.size === 0) return;
    const gen = generation;
    flushing = true;
    try {
      await transport.push(pushing);
      if (disposed || gen !== generation) return;
      serverLog = applyOutbox(serverLog, pushing);
      // Clear only the entries the Traveler hasn't re-touched mid-push; a
      // re-enqueued Place keeps its newer change and replays on the next flush.
      for (const [place, change] of pushing) {
        if (outbox.get(place) === change) outbox.delete(place);
      }
      commit();
      persistCache();
      persistOutbox();
    } catch {
      // offline or Supabase unreachable — the outbox replays on the next trigger
    } finally {
      flushing = false;
    }
  };

  const hydrate = async (): Promise<void> => {
    if (!traveler) return;
    disposed = false;
    const gen = ++generation;
    const [cachedLog, persistedOutbox] = await Promise.all([
      storage.loadCachedLog(),
      storage.loadOutbox(),
    ]);
    if (gen !== generation) return;
    if (cachedLog) serverLog = cachedLog;
    // Actions taken before hydration resolved win over the persisted outbox.
    if (persistedOutbox) {
      for (const [place, change] of persistedOutbox) {
        if (!outbox.has(place)) outbox.set(place, change);
      }
    }
    hydrated = true;
    commit(); // surface the cached overlay before any network read (ADR 0007)
    persistOutbox();
    if (!transport) return;
    try {
      const fresh = await transport.fetch();
      if (gen !== generation) return;
      serverLog = fresh;
      commit();
      persistCache();
    } catch {
      // offline cold start — the cached log carries the session
    }
    void flush();
  };

  const enqueue = (place: string, change: PendingChange): void => {
    if (disposed || !traveler) return;
    outbox.set(place, change); // coalesce: last action per Place wins (ADR 0009)
    commit();
    persistOutbox();
    // Defer the push until hydration has reconciled the persisted outbox and
    // the server log; otherwise an action taken mid-hydration could flush and
    // clear before the merge, letting a stale persisted entry re-win. Once
    // hydrated, hydrate()'s trailing flush has run, so this drives every sync.
    if (hydrated) void flush();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate,
    enqueue,
    flush,
    dispose: () => {
      disposed = true;
      generation += 1;
    },
  };
}
