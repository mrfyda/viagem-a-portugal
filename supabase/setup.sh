#!/usr/bin/env bash
#
# One-time Supabase setup for Traveler accounts (docs/adr/0007-0009).
#
# Run this on YOUR machine — it needs your Supabase credentials, which never
# enter the remote build environment. It links this repo to your hosted
# project, applies the visits migration, and pushes the auth config
# (email signup, confirmation off).
#
#   1. Create a project at https://supabase.com/dashboard (free tier, EU region)
#   2. Authenticate:  pnpm dlx supabase@2 login    (or export SUPABASE_ACCESS_TOKEN)
#   3. Run:
#        SUPABASE_PROJECT_REF=<ref> SUPABASE_DB_PASSWORD=<db password> \
#          ./supabase/setup.sh
#
# The project ref is the subdomain of your project URL
# (https://<ref>.supabase.co); the DB password is the one you set when
# creating the project (Project Settings -> Database to reset it).
#
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?set SUPABASE_PROJECT_REF to your project ref}"

cli="pnpm dlx supabase@2"
pw=()
[ -n "${SUPABASE_DB_PASSWORD:-}" ] && pw=(--password "$SUPABASE_DB_PASSWORD")

echo "==> Linking to $SUPABASE_PROJECT_REF"
$cli link --project-ref "$SUPABASE_PROJECT_REF" "${pw[@]}"

echo "==> Applying migrations (creates the visits table + RLS)"
$cli db push "${pw[@]}"

echo "==> Pushing auth config (email signup, confirmation off)"
$cli config push

cat <<'DONE'

Done. Remaining manual step (one time):
  Add these GitHub Actions repo secrets so deploy + keep-warm pick them up:
    SUPABASE_URL       = https://<ref>.supabase.co
    SUPABASE_ANON_KEY  = <anon/public key from Project Settings -> API>
  For local map dev, put the EXPO_PUBLIC_* equivalents in apps/map/.env.local
  (see supabase/README.md).
DONE
