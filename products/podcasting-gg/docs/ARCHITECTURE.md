# Architecture

**Plain-English summary.** Podcasting.gg is one web app (Next.js) talking to one
database (Supabase Postgres) that stores every customer's data in strictly separated
"organizations". Everything external (AI models, GoHighLevel, recording, hosting,
publishing, email, calendar) sits behind a swappable "adapter" with a built-in mock, so
the whole product runs on a laptop with no paid accounts. Slow work (AI analysis,
research, publishing) runs as background jobs, not inside page loads. AI is a layer that
drafts and detects; people approve. The database schema itself is in
[`DATABASE.md`](DATABASE.md).

## Stack
Next.js 16 (App Router, `proxy.ts` instead of `middleware.ts`, async `params`),
React 19, TypeScript strict, Tailwind v4 with design tokens in `src/app/globals.css`,
shadcn-style primitives (restyled) in `src/components/ui`, Supabase (Postgres, Auth,
Storage, RLS) via `@supabase/ssr`, Zod 4, React Hook Form, TanStack Query where useful,
Vitest + Testing Library, pnpm. No ORM: plain SQL migrations in `supabase/migrations`
and typed query modules in `src/db`. Deploy target Vercel + Supabase; local-first.
Reasons: [`DECISIONS.md`](DECISIONS.md) ADR-001, ADR-002, ADR-010.

## Layers (dependencies point down only)

```
components ─▶ services ─▶ db | adapters | jobs | ai
                  │                 │
                  └────▶ domain ◀───┘        (domain imports nothing above it)
lib (env, supabase clients, crypto, utils) is usable by every server layer
```

| Layer | Folder (`app/src/`) | Owns | Must not |
|---|---|---|---|
| Routes / UI | `app/`, `components/` | Pages, forms, display, calling services/server actions | Talk to Supabase or providers directly; hold business rules |
| Services | `services/` | Use-cases: "book guest", "import transcript", "accept opportunity"; orchestrate db + adapters + jobs; audit log entries | Contain provider-specific code |
| Domain | `domain/` | Pure logic + Zod schemas + state machines: episode status machine, guest pipeline, 20-episode milestone config, opportunity types, roles/permissions | Do I/O |
| Data | `db/` | One typed query module per aggregate (organizations, podcasts, guests, episodes, transcripts, opportunities, tasks, jobs, provider_connections, ...) | Contain business rules |
| Adapters | `adapters/<capability>/` | `interface.ts`, `mock.ts`, one file per real provider | Be imported by components |
| AI | `ai/` | Capability functions (`extractOpportunities()` ...) over a provider router; prompt assembly; Zod-validated structured output | Be called from the browser |
| Jobs | `jobs/` | Job definitions, handlers, in-process worker | Run inside page requests |
| Lib | `lib/` | `env.ts`, `utils.ts`, Supabase server/browser clients, `crypto.ts` (AES-256-GCM) | Contain product logic |

## Folder map

```
app/
  src/
    app/
      (auth)/login, (auth)/signup        public auth pages
      (app)/[org]/[workspace]/...        tenant-scoped product (home, guests, episodes,
                                         brain, opportunities, relationships, content,
                                         publishing, tasks, approvals, guest-mode, settings)
      setup/                             shown when Supabase env is missing
      api/jobs/work                      route handler that runs the job worker
      globals.css                        design tokens (light + dark)
    domain/    db/    services/    adapters/    ai/    jobs/    lib/    components/
    test/setup.ts
  supabase/migrations/                   numbered plain SQL
  scripts/db-local.sh                    throwaway Postgres 16 for migration + RLS tests
  .env.example
```

Adapter capabilities: `ai`, `crm`, `recording`, `hosting`, `research`, `email`,
`calendar`, `social_publishing`, `analytics`, `transcription`.

## Request flow

1. Browser hits `/(app)/[org]/[workspace]/episodes/[id]`.
2. `proxy.ts` refreshes the Supabase session cookie and redirects unauthenticated users
   to `/login`; if Supabase env is missing it routes to `/setup`.
3. The server component awaits `params`, resolves org/workspace slugs to IDs, and calls
   a service (or a `db` read for simple pages) using the **user-scoped** Supabase
   client, so RLS applies.
4. Mutations are Server Actions or route handlers → Zod-validate input → service →
   domain transition (e.g. `transitionEpisode(status, event)`) → `db` write → optional
   `jobs.enqueue(...)` → audit log → `revalidatePath`.
5. Anything slow returns immediately with a job id; the UI shows queued / processing /
   complete / failed and polls or refetches (TanStack Query) until done.

Only jobs and seeding use the service-role client, and only on the server.

## Adapter / capability model

Each capability defines an interface; providers implement it; a mock always exists.

```ts
// adapters/crm/interface.ts (shape, not full code)
interface CrmProvider {
  upsertContactByEmail(input): Promise<{ externalId: string }>;
  addTags(externalId, tags: string[]): Promise<void>;
  healthcheck(): Promise<ProviderStatus>;
}
```

`provider_connections` stores, per workspace: capability, provider key, status,
encrypted credentials, config JSON, last checked/error. The adapter registry picks the
connected provider for a capability, else the mock (dev) or "not connected" (prod).

Provider states (`provider_status` enum): `disconnected` → `connecting` → `connected`;
`degraded` (working, with recent errors), `error` (failing), `reauth_required`
(credentials rejected/expired). The Integrations UI shows the state, what connecting
enables, and the honest label: **real / mock / manual / planned**.

## AI capability flow

```
User action (e.g. "Analyze transcript")
  → Capability   ai/capabilities/extractOpportunities()  builds structured context + schema
  → AI service   ai/service.ts  picks the workspace's provider, enforces timeout/retries
  → Provider router  ai/router.ts  maps provider key → adapter family
  → Provider adapter  adapters/ai/{openai-compatible,anthropic,gemini}.ts
  → Model  returns JSON → Zod parse → retry on invalid → stored with provenance
```

Details, provider list and failure rules: [`AI.md`](AI.md).

## Background jobs

`background_jobs` table: `type`, `payload`, `status` (`queued / running / waiting /
completed / failed / retrying / cancelled`), `attempts`, `max_attempts`, `run_after`,
`idempotency_key` (unique), `locked_at/locked_by`, `last_error`, `related_type/id`,
`provider`, timestamps, tenant columns.

Worker: `jobs/worker.ts` claims jobs with `FOR UPDATE SKIP LOCKED`, runs the handler,
writes result/error, schedules retries with backoff. It runs in-process via the
`/api/jobs/work` route handler (called by a cron/ping in production) or `pnpm jobs:work`
locally. Handlers are pure functions of `(payload, ctx)` so they can later be registered
with Inngest or Trigger.dev without rewriting (ADR-005). V1 job types: transcript
processing, AI extraction (show notes, quotes, content ideas, opportunities), guest
research, knowledge chunking, provider sync, CRM tag push, publishing (mock).

## Multi-tenancy

`user → organization → workspace → podcast → episodes`. A user can belong to many
organizations; roles are `owner / admin / member / viewer` on `organization_members`.
Every product table carries `organization_id` and `workspace_id`. RLS is on for all of
them, with policies built on SQL helpers `is_org_member(org_id)` and
`has_org_role(org_id, min_role)`. Guest-facing pages (confirm details, release, sharing
kit) use signed magic-link tokens, never accounts. Internal fulfillment roles (V2) are a
separate table, not extra values in the customer role enum. Schema detail:
[`DATABASE.md`](DATABASE.md).

## Security model

- Auth: Supabase Auth, cookie sessions via `@supabase/ssr`; `proxy.ts` gates the app.
- Authorization: RLS is the source of truth; services additionally check role via
  `domain/permissions` for clearer errors.
- Credentials: customer provider keys are encrypted with AES-256-GCM using
  `CREDENTIAL_ENCRYPTION_KEY`; decrypted only inside adapters on the server; never
  returned to the browser (UI shows `sk-…last4`); never logged.
- Input: Zod on every action/route; file uploads go to Supabase Storage with
  per-workspace paths and type/size limits.
- Audit: `audit_logs` rows for consequential actions (guest contacted, transcript
  imported, opportunity accepted, episode published, integration connected).
- Secrets only in `.env.local` / Vercel env; `.env.example` lists names only.

## Mock mode

Mandatory. With an empty `.env.local` beyond Supabase, every capability resolves to its
mock: AI returns deterministic, clearly labeled sample output for each capability
(or the "not configured" state when the workspace has chosen no provider), CRM logs
tag pushes, publishing marks destinations "published (mock)", recording/hosting/
transcription fall back to manual URL entry and paste/upload. The seed creates
"Acme Advisory / The Founder Growth Show" with guests, episodes in several stages, a
realistic transcript, opportunities and tasks. Demo login `demo@podcasting.gg` /
`demo1234`.

## Extension points for V2

- **Billing / entitlements:** an `entitlements` table keyed by organization (feature,
  limit, source: plan/service) is reserved and read through one `domain/entitlements`
  function; V1 returns "unlimited". Payments and plans come from `platform/billing`.
- **Shared login:** identity is email + `ghl_contact_id` on `profiles`, so
  `platform/accounts` can take over auth later without data moves.
- **Marketplace:** guest profiles and podcast opportunity records are already separate
  aggregates with public/private fields, so a future matching layer reads them without
  schema surgery. Nothing is exposed publicly in V1.
- **Embeddings:** `knowledge_chunks.embedding` (pgvector, nullable) plus a `job` type
  `embed_chunks`; retrieval falls back to lexical `tsvector` search when embeddings are
  absent (ADR-008).
- **Jobs:** handler registry can be pointed at Inngest/Trigger.dev (ADR-005).
- **Internal operations:** fulfillment roles and SLA views are additive tables.
