#!/usr/bin/env bash
# Throwaway local Postgres 16 for Podcasting.gg. No Docker required.
#
#   scripts/db-local.sh start   # init (if needed) + start server, create db, apply schema + seed
#   scripts/db-local.sh stop    # stop server
#   scripts/db-local.sh reset   # drop + recreate database, re-apply shim, migrations, seed
#   scripts/db-local.sh test    # reset + run supabase/local/rls_tests.sql
#   scripts/db-local.sh psql    # open psql against the local db (extra args are passed through)
#
# Connection: postgresql://postgres@localhost:54329/podcasting_gg  (or -h /tmp)

set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PSQL_BIN="${PSQL_BIN:-/usr/bin/psql}"
PGDATA_DIR="${PGDATA_DIR:-$APP_ROOT/.pg-local}"
PGPORT="${PGPORT:-54329}"
PGSOCKET_DIR="${PGSOCKET_DIR:-/tmp}"
PGDATABASE_NAME="${PGDATABASE_NAME:-podcasting_gg}"
PGSUPERUSER="${PGSUPERUSER:-postgres}"
PGLOG="$PGDATA_DIR/postgres.log"

MIGRATIONS_DIR="$APP_ROOT/supabase/migrations"
SHIM_SQL="$APP_ROOT/supabase/local/auth_shim.sql"
RLS_TESTS_SQL="$APP_ROOT/supabase/local/rls_tests.sql"
SEED_SQL="$APP_ROOT/supabase/seed.sql"

# Postgres refuses to run as root. If we are root, run server-side commands
# as the `postgres` OS user (present on Debian/Ubuntu when postgresql-16 is
# installed). Otherwise run as the current user.
RUN_AS=()
if [[ "$(id -u)" == "0" ]]; then
  if id postgres >/dev/null 2>&1; then
    RUN_AS=(runuser -u postgres --)
  else
    echo "error: running as root and no 'postgres' OS user exists to drop to." >&2
    exit 1
  fi
fi

as_pg() { "${RUN_AS[@]}" "$@"; }

psql_super() {
  # psql as the DB superuser; ON_ERROR_STOP so failures abort the script.
  as_pg "$PSQL_BIN" -v ON_ERROR_STOP=1 -q -X -h "$PGSOCKET_DIR" -p "$PGPORT" -U "$PGSUPERUSER" "$@"
}

ensure_initdb() {
  if [[ -f "$PGDATA_DIR/PG_VERSION" ]]; then
    return
  fi
  echo "==> initdb into $PGDATA_DIR"
  mkdir -p "$PGDATA_DIR"
  if [[ ${#RUN_AS[@]} -gt 0 ]]; then
    chown postgres:postgres "$PGDATA_DIR"
  fi
  chmod 700 "$PGDATA_DIR"
  as_pg "$PGBIN/initdb" -D "$PGDATA_DIR" -U "$PGSUPERUSER" --auth=trust --encoding=UTF8 --locale=C.UTF-8 >/dev/null
  {
    echo "port = $PGPORT"
    echo "unix_socket_directories = '$PGSOCKET_DIR'"
    echo "listen_addresses = 'localhost'"
    echo "logging_collector = off"
    echo "fsync = off"
    echo "synchronous_commit = off"
    echo "full_page_writes = off"
  } | as_pg tee -a "$PGDATA_DIR/postgresql.conf" >/dev/null
}

is_running() {
  as_pg "$PGBIN/pg_ctl" -D "$PGDATA_DIR" status >/dev/null 2>&1
}

start_server() {
  ensure_initdb
  if is_running; then
    echo "==> postgres already running on port $PGPORT"
  else
    echo "==> starting postgres on port $PGPORT (log: $PGLOG)"
    as_pg "$PGBIN/pg_ctl" -D "$PGDATA_DIR" -l "$PGLOG" -w -t 30 start >/dev/null
  fi
  as_pg "$PGBIN/pg_isready" -h "$PGSOCKET_DIR" -p "$PGPORT" -t 30 >/dev/null
}

stop_server() {
  if [[ ! -f "$PGDATA_DIR/PG_VERSION" ]]; then
    echo "==> no local cluster at $PGDATA_DIR"
    return
  fi
  if is_running; then
    echo "==> stopping postgres"
    as_pg "$PGBIN/pg_ctl" -D "$PGDATA_DIR" -m fast -w stop >/dev/null
  else
    echo "==> postgres not running"
  fi
}

recreate_database() {
  echo "==> recreating database $PGDATABASE_NAME"
  psql_super -d postgres -c "drop database if exists $PGDATABASE_NAME with (force);"
  psql_super -d postgres -c "create database $PGDATABASE_NAME;"
}

apply_schema() {
  echo "==> applying auth shim"
  psql_super -d "$PGDATABASE_NAME" -f "$SHIM_SQL"

  echo "==> applying migrations"
  local f
  for f in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
    echo "    - $(basename "$f")"
    psql_super -d "$PGDATABASE_NAME" -f "$f"
  done

  echo "==> applying seed"
  psql_super -d "$PGDATABASE_NAME" -f "$SEED_SQL"
}

db_exists() {
  [[ "$(psql_super -d postgres -tAc "select 1 from pg_database where datname = '$PGDATABASE_NAME'")" == "1" ]]
}

cmd_start() {
  start_server
  if db_exists; then
    echo "==> database $PGDATABASE_NAME exists (use 'reset' to rebuild)"
  else
    recreate_database
    apply_schema
  fi
  echo "==> ready: postgresql://$PGSUPERUSER@localhost:$PGPORT/$PGDATABASE_NAME"
}

cmd_reset() {
  start_server
  recreate_database
  apply_schema
  echo "==> reset complete"
}

cmd_test() {
  cmd_reset
  echo "==> running RLS tests"
  psql_super -d "$PGDATABASE_NAME" -f "$RLS_TESTS_SQL"
}

cmd_psql() {
  start_server
  # Interactive: no -q so the banner and prompt behave normally.
  exec "${RUN_AS[@]}" "$PSQL_BIN" -X -h "$PGSOCKET_DIR" -p "$PGPORT" -U "$PGSUPERUSER" -d "$PGDATABASE_NAME" "$@"
}

usage() {
  sed -n '2,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 1
}

case "${1:-}" in
  start) shift; cmd_start "$@" ;;
  stop)  shift; stop_server "$@" ;;
  reset) shift; cmd_reset "$@" ;;
  test)  shift; cmd_test "$@" ;;
  psql)  shift; cmd_psql "$@" ;;
  *) usage ;;
esac
