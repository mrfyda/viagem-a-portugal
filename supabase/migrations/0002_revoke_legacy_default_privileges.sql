-- Bring a legacy project in line with Supabase's current cloud default, where
-- new entities are NOT auto-exposed to the Data API roles. Projects created
-- before that change carry ALTER DEFAULT PRIVILEGES that grant every new
-- table/sequence/function in `public` to anon and authenticated — which is why
-- `create table public.visits` silently handed anon full access (see 0001).
--
-- Revoking these defaults makes the explicit-grant model of docs/adr/0007 the
-- whole story: each table opts specific roles in (as visits does), and nothing
-- in `public` is reachable until a migration grants it. This matches the
-- `auto_expose_new_tables`-unset behaviour in supabase/config.toml.
--
-- Scope: only the defaults owned by the migration role (the role running these
-- statements). Affects objects created AFTER this runs; existing grants are
-- untouched. Idempotent on new-default projects where these grants were never
-- present. service_role and postgres keep their defaults.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
