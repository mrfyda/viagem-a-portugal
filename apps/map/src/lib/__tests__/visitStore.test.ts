import { describe, expect, it } from "vitest";

import { keyedStorage } from "../keyedStorage";
import type { Visits } from "../progress";
import type { Outbox } from "../sync";
import { createVisitStore, type VisitStorage, type VisitTransport } from "../visitStore";

// --- in-memory adapters: the test seam (two adapters → the seam is real) ---

interface FakeTransport extends VisitTransport {
  rows: Map<string, string | null>;
  pushed: Outbox[];
  online: boolean;
  /** Hold the next push open until the returned resolve() is called. */
  blockPush(): { resolve: () => void };
}

function memoryTransport(seed: Iterable<[string, string | null]> = []): FakeTransport {
  const rows = new Map(seed);
  let release: (() => void) | null = null;
  return {
    rows,
    pushed: [],
    online: true,
    blockPush() {
      const gate = new Promise<void>((resolve) => (release = resolve));
      const original = this.push.bind(this);
      this.push = async (outbox) => {
        await gate;
        this.push = original;
        return original(outbox);
      };
      return { resolve: () => release?.() };
    },
    async fetch() {
      if (!this.online) throw new Error("offline");
      return new Map(rows);
    },
    async push(outbox: Outbox) {
      if (!this.online) throw new Error("offline");
      this.pushed.push(new Map(outbox));
      for (const [place, change] of outbox) {
        if (change === "unmark") rows.delete(place);
        else rows.set(place, change.visitedOn);
      }
    },
  };
}

function memoryStorage(initial?: { log?: Visits; outbox?: Outbox }): VisitStorage {
  let log: Visits | null = initial?.log ?? null;
  let outbox: Outbox | null = initial?.outbox ?? null;
  return {
    loadCachedLog: async () => log,
    saveCachedLog: async (next) => {
      log = new Map(next);
    },
    loadOutbox: async () => outbox,
    saveOutbox: async (next) => {
      outbox = new Map(next);
    },
  };
}

/** Drain microtasks and the fakes' immediate promises. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const u = { userId: "u1" };

describe("VisitStore lifecycle", () => {
  it("marks optimistically and pushes once when online", async () => {
    const transport = memoryTransport();
    const store = createVisitStore({ traveler: u, transport, storage: memoryStorage() });
    await store.hydrate();
    await settle();

    store.enqueue("Bragança", { visitedOn: null });
    expect(store.getSnapshot().visits.get("Bragança")).toBe(null); // optimistic
    expect(store.getSnapshot().pending).toBe(true);

    await settle();
    expect(transport.pushed).toHaveLength(1);
    expect(transport.rows.get("Bragança")).toBe(null); // reached the "server"
    expect(store.getSnapshot().pending).toBe(false); // outbox cleared
    store.dispose();
  });

  it("coalesces to the last action per Place across an offline window", async () => {
    const transport = memoryTransport();
    const store = createVisitStore({ traveler: u, transport, storage: memoryStorage() });
    await store.hydrate();
    await settle();

    transport.online = false; // pushes fail; the outbox accumulates
    store.enqueue("Évora", { visitedOn: null });
    store.enqueue("Évora", { visitedOn: "2025-05-01" });
    store.enqueue("Évora", "unmark");
    await settle();
    expect(transport.pushed).toHaveLength(0);
    expect(store.getSnapshot().visits.has("Évora")).toBe(false); // coalesced to unmark
    expect(store.getSnapshot().pending).toBe(true);

    transport.online = true;
    await store.flush();
    await settle();
    expect(transport.pushed).toHaveLength(1);
    expect(transport.pushed[0].size).toBe(1); // one coalesced entry, not three
    expect(store.getSnapshot().pending).toBe(false);
    store.dispose();
  });

  it("surfaces the cached log on an offline cold start", async () => {
    const transport = memoryTransport();
    transport.online = false; // fetch will reject
    const storage = memoryStorage({ log: new Map([["Lisboa", "1979-04-01"]]) });
    const store = createVisitStore({ traveler: u, transport, storage });

    await store.hydrate();
    await settle();
    expect(store.getSnapshot().visits.get("Lisboa")).toBe("1979-04-01"); // cached, no fetch
    store.dispose();
  });

  it("lets an action taken before hydration win over the persisted outbox", async () => {
    // Persisted outbox marks Sortelha with no date; a fresh action sets a date
    // before hydration resolves — the fresh action must win.
    const storage = memoryStorage({ outbox: new Map([["Sortelha", { visitedOn: null }]]) });
    const transport = memoryTransport();
    const store = createVisitStore({ traveler: u, transport, storage });

    const hydration = store.hydrate(); // not yet awaited
    store.enqueue("Sortelha", { visitedOn: "2025-06-01" });
    await hydration;
    await settle();

    // the dated action survived the merge and reached the server
    expect(transport.rows.get("Sortelha")).toBe("2025-06-01");
    store.dispose();
  });

  it("clears only entries the Traveler has not re-touched mid-push", async () => {
    const transport = memoryTransport();
    const store = createVisitStore({ traveler: u, transport, storage: memoryStorage() });
    await store.hydrate();
    await settle();

    const gate = transport.blockPush();
    store.enqueue("Marvão", { visitedOn: null }); // flush #1 captures the mark, then blocks
    await settle();
    store.enqueue("Marvão", "unmark"); // re-touched while the push is in flight
    gate.resolve();
    await settle();

    expect(transport.pushed).toHaveLength(1);
    expect(transport.pushed[0].get("Marvão")).toEqual({ visitedOn: null }); // the captured mark
    expect(store.getSnapshot().visits.has("Marvão")).toBe(false); // overlay shows the unmark
    expect(store.getSnapshot().pending).toBe(true); // unmark still queued

    await store.flush();
    await settle();
    expect(transport.pushed).toHaveLength(2);
    expect(transport.pushed[1].get("Marvão")).toBe("unmark");
    expect(store.getSnapshot().pending).toBe(false);
    store.dispose();
  });

  it("writes nothing and notifies nobody after dispose", async () => {
    const transport = memoryTransport();
    const store = createVisitStore({ traveler: u, transport, storage: memoryStorage() });
    await store.hydrate();
    await settle();

    const gate = transport.blockPush();
    store.enqueue("Óbidos", { visitedOn: null }); // push starts, blocks
    await settle();

    let notifiedAfterDispose = false;
    store.subscribe(() => {
      notifiedAfterDispose = true;
    });
    store.dispose();
    gate.resolve(); // push completes on the server, after teardown
    await settle();

    expect(transport.pushed).toHaveLength(1); // the server write was already sent
    expect(notifiedAfterDispose).toBe(false); // but the store wrote/notified nothing
  });

  it("is fully read-only when signed out", async () => {
    const store = createVisitStore({ traveler: null, transport: memoryTransport(), storage: memoryStorage() });
    await store.hydrate();
    store.enqueue("Porto", { visitedOn: null });
    await store.flush();
    await settle();
    expect(store.getSnapshot().visits.size).toBe(0);
    expect(store.getSnapshot().pending).toBe(false);
  });
});

describe("keyedStorage adapter", () => {
  it("suffixes keys per Traveler and roundtrips log + outbox", async () => {
    const mem = new Map<string, string>();
    const load = async (k: string) => mem.get(k) ?? null;
    const save = async (k: string, v: string) => {
      mem.set(k, v);
    };

    const s1 = keyedStorage(load, save, "u1");
    await s1.saveCachedLog(new Map([["Lisboa", "1979-01-01"]]));
    await s1.saveOutbox(new Map([["Porto", { visitedOn: null }]]));
    expect([...mem.keys()].every((k) => k.endsWith("/u1"))).toBe(true);

    // a different Traveler on the same device sees nothing
    const s2 = keyedStorage(load, save, "u2");
    expect(await s2.loadCachedLog()).toBeNull();
    expect(await s2.loadOutbox()).toBeNull();

    // u1 roundtrips through the versioned (de)serialization
    expect(await s1.loadCachedLog()).toEqual(new Map([["Lisboa", "1979-01-01"]]));
    expect(await s1.loadOutbox()).toEqual(new Map([["Porto", { visitedOn: null }]]));
  });

  it("is a no-op with no Traveler", async () => {
    const s = keyedStorage(
      async () => null,
      async () => {},
      null,
    );
    expect(await s.loadCachedLog()).toBeNull();
    expect(await s.loadOutbox()).toBeNull();
    await expect(s.saveCachedLog(new Map())).resolves.toBeUndefined(); // no throw
  });
});
