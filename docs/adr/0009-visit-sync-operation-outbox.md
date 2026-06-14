# Visit sync: operation outbox, arrival order wins

A Traveler's Visits live in one Supabase table
(`visits(user_id, index_name, visited_on date null)`, RLS-scoped, primary
key `(user_id, index_name)`). Each client action — mark (upsert), unmark
(delete), set-date (update) — is an operation queued in a local outbox and
replayed in order when the network returns; on load the client fetches the
log and then replays anything still queued. When two devices disagree about
a Place, whichever syncs last wins.

## Considered options

Timestamped last-write-wins was rejected: it needs delete tombstones and
trusted clocks to protect against a conflict that requires the same person
editing the same town on two devices within one offline window. CRDT/sync
engines (PowerSync, ElectricSQL, Replicache, Automerge-in-a-column) were
seriously considered and rejected: Replicache needs server endpoints we
don't have, PowerSync adds a third vendor, and all of them solve
collaborative-editing problems a single person's travel diary does not
have. Revisit only if Visits grow rich offline payloads (notes, photos).
