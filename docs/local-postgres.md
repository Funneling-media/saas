# Running a real Postgres locally without Docker

Claude's cloud sessions have Postgres 16 binaries but no Docker daemon. To test a
product's migrations against a real database:

```bash
PGDATA=/tmp/pgdata; PGBIN=/usr/lib/postgresql/16/bin
$PGBIN/initdb -D $PGDATA -U postgres --auth=trust >/dev/null
$PGBIN/pg_ctl -D $PGDATA -o "-p 54329 -k /tmp" -l /tmp/pg.log start
psql -h /tmp -p 54329 -U postgres -c "create database app;"
# apply migrations, e.g.
for f in supabase/migrations/*.sql; do psql -h /tmp -p 54329 -U postgres -d app -v ON_ERROR_STOP=1 -f "$f"; done
```

Supabase-specific pieces (`auth.users`, `auth.uid()`) need a small shim before
product migrations; each product's `LOCAL_DEVELOPMENT.md` says how.
