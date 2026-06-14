# Supabase (free tier) as the sync backend

Visits sync across a Traveler's devices, which needs auth and a server-side
store — the first runtime dependency beyond static hosting. We chose Supabase
on the free tier: Postgres with Row Level Security (`user_id = auth.uid()`)
is the entire authorization model for private per-Traveler rows, the client
SDK works from a static site and from Expo native, and there is no server of
ours to operate. Firebase (NoSQL modeling for relational data), PocketBase
(needs a host), and a hand-rolled API (hand-rolled auth) were rejected.

## Consequences

- The map must stay fully functional read-only without Supabase: anonymous
  visitors never touch it, and a signed-in Traveler's actions queue locally
  when it is unreachable.
- The free tier pauses projects after ~a week of inactivity, which would
  break sign-in and sync silently. A scheduled GitHub Action pings the
  project weekly to keep it warm — that cron exists on purpose.
