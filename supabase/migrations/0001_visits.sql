-- A Traveler's Visits: one row per (Traveler, Place), keyed by the book
-- index entry (indexName). Sync semantics are in docs/adr/0009 — clients
-- replay an offline outbox of mark (upsert) / unmark (delete) / set-date
-- (update) operations; whichever device syncs last wins.

create table public.visits (
  user_id uuid not null references auth.users (id) on delete cascade,
  index_name text not null,
  visited_on date,
  updated_at timestamptz not null default now(),
  primary key (user_id, index_name)
);

alter table public.visits enable row level security;

-- RLS is the entire authorization model (docs/adr/0007): Visits are private
-- to their Traveler. Scoped to `authenticated` only — anonymous visitors
-- never read or write Visits (the map's place data is static JSON, not the
-- Data API), so the `anon` role gets no grants at all.
create policy "Travelers manage their own visits"
  on public.visits for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- New Supabase projects do not auto-expose tables to the Data API, so grant
-- the authenticated role least-privilege access (no DELETE-all surface
-- beyond what RLS already gates). RLS still constrains every row.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.visits to authenticated;

-- Older projects still carry the legacy default privileges that auto-grant
-- every new public table to `anon`, so `create table` above silently handed
-- anon full access here. Revoke it explicitly: anon must reach Visits through
-- no path at all (docs/adr/0007), not merely be stopped by RLS having no
-- anon policy. Harmless and idempotent on new-default projects where anon
-- never received the grant.
revoke all on public.visits from anon;
