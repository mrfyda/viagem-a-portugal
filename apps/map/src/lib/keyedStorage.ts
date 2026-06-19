import { deserializeVisits, serializeVisits, type Visits } from "./progress";
import { deserializeOutbox, serializeOutbox, type Outbox } from "./sync";
import type { VisitStorage } from "./visitStore";

// Per-account: keys are suffixed with the Traveler's user id, so switching
// accounts on one device never mixes journeys.
const CACHE_KEY = "viagem-a-portugal/journey-cache";
const OUTBOX_KEY = "viagem-a-portugal/outbox";

type Load = (key: string) => Promise<string | null>;
type Save = (key: string, value: string) => Promise<void>;

/**
 * The production VisitStorage: wraps the platform load/save primitives
 * (storage.ts / storage.web.ts) into the port, owning the per-account key
 * suffix and the versioned (de)serialization. `userId` null ⇒ nothing to
 * persist, every method a no-op (the signed-out path never reaches here).
 */
export function keyedStorage(load: Load, save: Save, userId: string | null): VisitStorage {
  return {
    loadCachedLog: async () => {
      if (!userId) return null;
      const raw = await load(`${CACHE_KEY}/${userId}`);
      return raw ? deserializeVisits(raw) : null;
    },
    saveCachedLog: (log: Visits) =>
      userId ? save(`${CACHE_KEY}/${userId}`, serializeVisits(log)) : Promise.resolve(),
    loadOutbox: async () => {
      if (!userId) return null;
      const raw = await load(`${OUTBOX_KEY}/${userId}`);
      return raw ? deserializeOutbox(raw) : null;
    },
    saveOutbox: (outbox: Outbox) =>
      userId ? save(`${OUTBOX_KEY}/${userId}`, serializeOutbox(outbox)) : Promise.resolve(),
  };
}
