import type { SupabaseClient } from "@supabase/supabase-js";

import type { Visits } from "./progress";

/**
 * The offline outbox (docs/adr/0009): the Traveler's not-yet-synced actions,
 * coalesced to one desired end state per Place. A `{ visitedOn }` entry
 * upserts the row (mark / set-date); "unmark" deletes it. Replayed whenever
 * the network allows; whichever device syncs last wins.
 */
export type PendingChange = { visitedOn: string | null } | "unmark";
export type Outbox = ReadonlyMap<string, PendingChange>;

/** The visit log as this device believes the server will see it. */
export function applyOutbox(log: Visits, outbox: Outbox): Map<string, string | null> {
  const merged = new Map(log);
  for (const [place, change] of outbox) {
    if (change === "unmark") merged.delete(place);
    else merged.set(place, change.visitedOn);
  }
  return merged;
}

const OUTBOX_VERSION = 1;

export function serializeOutbox(outbox: Outbox): string {
  return JSON.stringify({ v: OUTBOX_VERSION, changes: Object.fromEntries(outbox) });
}

export function deserializeOutbox(raw: string): Map<string, PendingChange> | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.v !== OUTBOX_VERSION || typeof parsed.changes !== "object") return null;
    return new Map(Object.entries(parsed.changes as Record<string, PendingChange>));
  } catch {
    return null;
  }
}

interface VisitRow {
  index_name: string;
  visited_on: string | null;
}

export async function fetchVisits(
  client: SupabaseClient,
): Promise<Map<string, string | null>> {
  const { data, error } = await client.from("visits").select("index_name, visited_on");
  if (error) throw error;
  return new Map((data as VisitRow[]).map((row) => [row.index_name, row.visited_on]));
}

export async function pushOutbox(
  client: SupabaseClient,
  userId: string,
  outbox: Outbox,
): Promise<void> {
  const upserts: (VisitRow & { user_id: string })[] = [];
  const deletes: string[] = [];
  for (const [place, change] of outbox) {
    if (change === "unmark") deletes.push(place);
    else upserts.push({ user_id: userId, index_name: place, visited_on: change.visitedOn });
  }
  if (upserts.length > 0) {
    const { error } = await client.from("visits").upsert(upserts);
    if (error) throw error;
  }
  if (deletes.length > 0) {
    const { error } = await client
      .from("visits")
      .delete()
      .eq("user_id", userId)
      .in("index_name", deletes);
    if (error) throw error;
  }
}
