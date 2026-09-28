# Local development

**Plain-English summary.** You can run all of Podcasting.gg on one computer for free.
You need Node, pnpm and a database. The database can be a free hosted Supabase project
(easiest), Supabase running locally via its CLI (fully offline), or a throwaway Postgres
just for testing the schema. Log in with the demo account and everything runs in mock
mode with sample data.

## Prerequisites
- Node.js 20 or newer, pnpm 10 (`corepack enable` gives you pnpm)
- Git
- One of: a Supabase account (free), Docker (for Supabase CLI or the throwaway Postgres),
  or Postgres 16 installed locally
- Optional: an AI key (or Ollama) to try real AI; everything else works in mock mode

## Install
```bash
cd products/podcasting-gg/app
pnpm install
cp .env.example .env.local
```

## Environment: pick one option

### Option A: Supabase hosted free project (recommended first run)
1. supabase.com → New project. Wait for it to provision.
2. Settings → API: copy Project URL, anon key, service role key into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Apply migrations and seed:
   ```bash
   pnpm dlx supabase login
   pnpm dlx supabase link --project-ref <ref>
   pnpm dlx supabase db push          # runs supabase/migrations
   pnpm db:seed                       # demo org, podcast, guests, episodes, transcript
   ```

### Option B: Supabase CLI fully local (offline)
```bash
pnpm dlx supabase start               # needs Docker; prints URL + keys
# paste API URL, anon key, service_role key into .env.local
pnpm dlx supabase db reset            # applies migrations + seed.sql
pnpm db:seed
```
`pnpm dlx supabase stop` when done. Studio runs at http://localhost:54323.

### Option C: schema-only Postgres (migrations + RLS tests, no app login)
For testing the database without Supabase at all. `scripts/db-local.sh` starts a
throwaway Postgres 16 (Docker) with a small `auth` schema shim so RLS helpers and
policies can be tested.
```bash
pnpm db:local:start     # start container
pnpm db:local:reset     # drop + re-apply all migrations
pnpm db:local:test      # apply migrations, run RLS/tenant-isolation tests
pnpm db:local:stop
```
Option C does not give you Auth or Storage, so the web app still needs A or B.

### Always set
```bash
openssl rand -base64 32   # → CREDENTIAL_ENCRYPTION_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
Leave `AI_DEFAULT_*` and `GHL_*` empty to run in mock mode.

## Run
```bash
pnpm dev                 # http://localhost:3000
pnpm jobs:work           # (arrives with Milestone 6) background job worker for AI, research, publishing
```
If Supabase env is missing, the app shows the `/setup` page with these instructions
instead of crashing.

**Demo login:** `demo@podcasting.gg` / `demo1234` (created by the seed). You land in
"Acme Advisory / The Founder Growth Show" with guests, episodes at several stages, a
realistic transcript, detected opportunities and tasks.

## Try real AI (optional)
Settings → AI → add a provider key, or for zero cost install Ollama, `ollama pull llama3.1`,
and connect with base URL `http://localhost:11434/v1`. Or set `AI_DEFAULT_*` in `.env.local`.

## Checks before saying "done"
```bash
pnpm check           # lint + typecheck + unit tests (domain, AI parsing, services)
pnpm db:local:test   # migrations apply cleanly + RLS/tenant isolation tests
pnpm format          # prettier
```

## Common problems
| Symptom | Fix |
|---|---|
| App shows `/setup` page | `NEXT_PUBLIC_SUPABASE_URL` / anon key missing in `.env.local`; restart `pnpm dev` after editing env |
| Login works but pages are empty | Seed not run: `pnpm db:seed` (needs `DATABASE_URL`) |
| "CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters" | Generate with `openssl rand -base64 32` |
| AI buttons disabled | Expected without a provider; connect one in Settings → AI or pick "Mock (demo)" |
| Jobs stuck in `queued` | Run `pnpm jobs:work` or hit `GET /api/jobs/work` |
| `db-local.sh` fails to start | Docker not running, or port 54329 in use; `pnpm db:local:stop` then start again |
| RLS test fails after adding a table | Table lacks `organization_id`/`workspace_id`, `ENABLE ROW LEVEL SECURITY`, or policies using `is_org_member` |
| Type errors about `params` | Next 16: `params` is a Promise; `const { org } = await params` |
| Migration works locally, fails on Supabase | Order matters; never edit an applied migration, add a new numbered file |
