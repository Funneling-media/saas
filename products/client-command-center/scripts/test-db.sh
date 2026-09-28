#!/usr/bin/env bash
# Runs the database tests against a disposable local Postgres cluster.
#
# If TEST_DATABASE_URL is already set (a superuser URL for a disposable server), it is used
# as-is and no cluster is started. Each test file creates and drops its own database, so
# never point this at a real Supabase project.
set -euo pipefail

cd "$(dirname "$0")/.."

run_tests() {
  node --import tsx --test --test-concurrency=1 tests/db/*.test.ts
}

if [[ -n "${TEST_DATABASE_URL:-}" ]]; then
  run_tests
  exit
fi

PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [[ -z "$PG_BIN" || ! -x "$PG_BIN/initdb" ]]; then
  PG_BIN="$(dirname "$(command -v initdb || echo /nonexistent/initdb)")"
fi
if [[ ! -x "$PG_BIN/initdb" ]]; then
  echo "Postgres server binaries not found. Install Postgres 15+ or set TEST_DATABASE_URL." >&2
  exit 1
fi

PORT="${TEST_PG_PORT:-55432}"
DATA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cc-test-pg.XXXXXX")"

# Postgres refuses to run as root; use the postgres system user in that case.
as_pg() {
  if [[ "$(id -u)" == "0" ]]; then
    runuser -u postgres -- "$@"
  else
    "$@"
  fi
}

if [[ "$(id -u)" == "0" ]]; then
  chown postgres "$DATA_DIR"
  PG_USER=postgres
else
  PG_USER="$(id -un)"
fi

cleanup() {
  as_pg "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT

as_pg "$PG_BIN/initdb" -D "$DATA_DIR" -U "$PG_USER" --auth=trust >/dev/null
as_pg "$PG_BIN/pg_ctl" -D "$DATA_DIR" -o "-p $PORT -k $DATA_DIR -c listen_addresses=127.0.0.1" -w start >/dev/null

export TEST_DATABASE_URL="postgres://$PG_USER@127.0.0.1:$PORT/postgres"
run_tests
