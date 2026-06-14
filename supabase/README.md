# Supabase setup

The sync backend for Traveler accounts (docs/adr/0007–0009).

## Fastest path: the setup script

The hosted project is account- and billing-bound, so it must be created and
linked from your own machine — credentials never touch the remote build env.

1. Create a project at <https://supabase.com/dashboard> (free tier, EU
   region). Set a database password and keep it; note the **project ref**
   (the `<ref>` in `https://<ref>.supabase.co`).
2. Authenticate the CLI: `pnpm dlx supabase@2 login` (or export
   `SUPABASE_ACCESS_TOKEN`).
3. Run, from the repo root:
   ```sh
   SUPABASE_PROJECT_REF=<ref> SUPABASE_DB_PASSWORD=<db password> \
     ./supabase/setup.sh
   ```
   This links the project, applies `migrations/0001_visits.sql` (the visits
   table + RLS), and pushes the auth config (email signup, **confirmation
   off** — ADR 0008). `supabase/config.toml` already encodes those auth
   settings, so no dashboard clicking is needed.
4. Add GitHub repo secrets so `deploy.yml` and `keep-warm.yml` pick them up:
   - `SUPABASE_URL` — `https://<ref>.supabase.co`
   - `SUPABASE_ANON_KEY` — the anon/public key (Project Settings → API);
     public by design, RLS does the protecting.
5. Local map dev: create `apps/map/.env.local` (gitignored) with
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```

## Manual equivalent

If you prefer the dashboard: run `migrations/0001_visits.sql` in the SQL
Editor, and under Authentication → Sign In / Up → Email, **disable "Confirm
email"**. Then do steps 4–5 above.

## Run it fully local (Colima on Apple Silicon)

No hosted project needed — run the whole stack on your machine. The Supabase
CLI drives a **Docker daemon**, so you need a Docker-API runtime; Apple's
`container` does not expose one. Colima works well (lightweight, CLI-only,
Apple's `vz` virtualisation under the hood):

1. `brew install colima docker`
2. `colima start` (boots the Docker VM; `brew services start colima` to
   auto-start it at login).
3. From the repo root: `pnpm dlx supabase@2 start -x vector,logflare`. The
   analytics `vector` service bind-mounts the Docker socket, which Colima
   can't mount — excluding it (and `logflare`) skips that; everything the map
   uses (Postgres, Auth, REST, Kong, Studio) still runs. Migrations apply on
   first start.
4. `pnpm dlx supabase@2 status -o env` prints `API_URL` + `ANON_KEY`; put them
   in `apps/map/.env.local` (gitignored):
   ```
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```
5. (Re)start `pnpm --filter map web` — `EXPO_PUBLIC_*` is inlined at launch.

Studio: <http://127.0.0.1:54323>. `supabase db reset` re-applies migrations on
a clean DB; `supabase stop` then `colima stop` shut it all down.

When the env vars are absent the map builds and runs read-only: sign-in is
hidden and no Supabase code path is reached. The keep-warm workflow pings
the REST API twice a week so the free-tier project is never paused for
inactivity.
