#!/usr/bin/env bash
# Load demo data into the database named by DATABASE_URL (Supabase → Settings → Database → connection string).
# Re-runnable: the seed uses fixed ids and `on conflict do nothing`.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f .env.local ]]; then set -a; source .env.local; set +a; fi
: "${DATABASE_URL:?Set DATABASE_URL in app/.env.local (Supabase → Settings → Database → Connection string, URI)}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
echo "Demo data loaded. Sign in with demo@podcasting.gg / demo1234"
