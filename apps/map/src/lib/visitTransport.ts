import type { SupabaseClient } from "@supabase/supabase-js";

import type { Visits } from "./progress";
import { fetchVisits, pushOutbox, type Outbox } from "./sync";
import type { VisitTransport } from "./visitStore";

/**
 * The production VisitTransport: the Supabase `visits` table, bound to one
 * Traveler. Wraps the existing tested sync functions, so no round-trip logic
 * is reimplemented — this adapter is the only place the store reaches Supabase.
 */
export function supabaseTransport(client: SupabaseClient, userId: string): VisitTransport {
  return {
    fetch: (): Promise<Visits> => fetchVisits(client),
    push: (outbox: Outbox): Promise<void> => pushOutbox(client, userId, outbox),
  };
}
