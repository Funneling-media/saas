# Architecture decision log

**Plain-English summary.** This is the list of big technical choices we made, why, and
what we gave up. Once a decision is here, we don't reopen it without new evidence. Add a
new entry (next ID, today's date) whenever a consequential choice is made; never rewrite
history, supersede it with a new ADR that references the old one.

Format: ID, date, decision, context, alternatives, choice, rationale, implications.

---

## ADR-001: Stack — Next.js 16 + Supabase, no Prisma
- **Date:** 2026-09-28
- **Decision:** Next.js 16 (App Router, `proxy.ts`, async `params`), React 19, TypeScript strict, Tailwind v4, Supabase (Postgres, Auth, Storage, RLS) via `@supabase/ssr`, Zod 4, React Hook Form, TanStack Query where useful, Vitest, pnpm. No Prisma.
- **Context:** Brief recommends this stack; founder is local-first, cost-sensitive, will deploy to Vercel + Supabase.
- **Alternatives:** Remix/SvelteKit; Prisma or Drizzle ORM; separate API server (NestJS); Firebase.
- **Choice:** As decided. Server Actions and route handlers for mutations; no separate API service.
- **Rationale:** One framework, one hosting story, free tiers everywhere. Supabase gives auth, storage and RLS without extra services. An ORM adds a second schema language and fights RLS/pgvector/enums; Supabase's typed client plus hand-written query modules is simpler.
- **Implications:** Team must be comfortable with SQL. Generated database types (`supabase gen types`) keep query modules typed. Vercel-compatible from day one.

## ADR-002: Plain SQL migrations + typed query modules
- **Date:** 2026-09-28
- **Decision:** Schema lives in numbered SQL files in `supabase/migrations`; data access lives in one typed module per aggregate in `src/db`.
- **Context:** Follows from ADR-001. Need enums, RLS policies, helper functions, pgvector, `tsvector` — all first-class in SQL, awkward in ORMs.
- **Alternatives:** Prisma migrate; Drizzle Kit; Supabase dashboard edits.
- **Choice:** SQL migrations applied with Supabase CLI; `scripts/db-local.sh` runs them against a throwaway Postgres 16 with an `auth` schema shim for tests.
- **Rationale:** Full control over Postgres features; migrations reviewable in PRs; testable without a Supabase account.
- **Implications:** Never edit applied migrations. Every table change comes with a query-module update and, for tenant tables, an RLS test. Detail in `DATABASE.md`.

## ADR-003: Multi-tenant model and RLS helper functions
- **Date:** 2026-09-28
- **Decision:** `user → organization → workspace → podcast`. Every product table carries `organization_id` + `workspace_id`. RLS on all tenant tables using SQL helpers `is_org_member(org_id)` and `has_org_role(org_id, min_role)`. Roles: owner / admin / member / viewer.
- **Context:** Brief demands strict tenant boundaries, teams, multiple orgs per user, and future internal fulfillment roles distinct from customer roles.
- **Alternatives:** Application-level filtering only; schema-per-tenant; workspace as the only tenant key.
- **Choice:** Row-level security enforced in the database, with denormalized org/workspace columns on every row.
- **Rationale:** RLS makes isolation a database guarantee, not a code convention. Denormalized columns keep policies simple and fast. Roles as an enum keep permission checks uniform in `domain/permissions`.
- **Implications:** Service-role client only in jobs/seeds. Adding a table means adding policies and a test. Internal fulfillment roles will be a separate table, never new values in the customer role enum.

## ADR-004: Bring-your-own-AI with provider router and structured outputs
- **Date:** 2026-09-28
- **Decision:** Features call capability functions in `src/ai`; a router maps the workspace's configured provider to one of three adapter families (OpenAI-compatible HTTP, Anthropic, Gemini). All automation-critical outputs are JSON validated with Zod, with a repair/retry policy.
- **Context:** Brief forbids coupling to one vendor and requires no credits/metering in V1. Customers supply keys.
- **Alternatives:** Vercel AI SDK as the abstraction; single vendor (OpenAI) for V1; LangChain.
- **Choice:** Thin in-house abstraction over raw HTTP; env `AI_DEFAULT_*` as dev fallback only.
- **Rationale:** Nine providers collapse into three protocols; owning the layer keeps prompts, schemas and provenance under our control and avoids SDK churn. Structured output removes regex parsing and makes the Opportunity Engine testable.
- **Implications:** No vendor SDK outside `adapters/ai`. Every capability declares schema, context layers and token budget. See `AI.md`.

## ADR-005: Background jobs as a Postgres table + in-process worker
- **Date:** 2026-09-28
- **Decision:** `background_jobs` table with status enum (queued/running/waiting/completed/failed/retrying/cancelled), idempotency keys, retries with backoff; a worker claims rows with `FOR UPDATE SKIP LOCKED`, run by a route handler (`/api/jobs/work`, cron-pinged in production) or `pnpm jobs:work` locally.
- **Context:** Long AI/provider work must not run in page requests; V1 must stay free and local.
- **Alternatives:** Inngest or Trigger.dev now; Supabase Edge Functions + pg_cron; Redis queue (BullMQ).
- **Choice:** Table + worker now; handlers written as pure `(payload, ctx)` functions so they can be registered with Inngest/Trigger.dev later.
- **Rationale:** Zero extra infrastructure, full visibility in the DB, good enough for V1 volumes. Migration path is a thin registration layer, not a rewrite.
- **Implications:** Concurrency limited by cron cadence on Vercel; job UI states come straight from the table. Revisit when job volume or latency needs exceed a minute-cadence cron.

## ADR-006: Mock-first adapters
- **Date:** 2026-09-28
- **Decision:** Every capability (`ai, crm, recording, hosting, research, email, calendar, social_publishing, analytics, transcription`) has an interface, a mock, and zero or more real providers. Every integration is labeled real / mock / manual / planned in code, UI and docs.
- **Context:** Founder lacks enterprise API access; product must be demonstrable locally; "no fake completion" rule.
- **Alternatives:** Build only real integrations as credentials arrive; feature-flag unavailable integrations off.
- **Choice:** Mocks are first-class, deterministic and clearly labeled; manual workflows exist wherever a provider is absent.
- **Rationale:** Keeps the core loop testable end to end and honest about status.
- **Implications:** Interface changes update the mock in the same PR. Production never silently uses a mock for external effects; it shows "not connected".

## ADR-007: No credits or billing in V1; entitlements later
- **Date:** 2026-09-28
- **Decision:** No Stripe, credit wallets, metering or plan limits in V1. Reserve an `entitlements` table and a single `domain/entitlements` lookup returning "unlimited".
- **Context:** Brief section 6; platform rule that billing lives in `platform/billing`.
- **Alternatives:** Ship a minimal Stripe subscription; meter AI usage from day one.
- **Choice:** Nothing billable in the product; usage provenance (tokens, durations) is recorded for future insight only.
- **Rationale:** BYO-AI means no marginal AI cost to us; billing belongs to the shared platform so bundles work across products.
- **Implications:** Managed-service concepts ($5k Content Team, $997 Account Manager) map to entitlement rows later, never hardcoded limits.

## ADR-008: Lexical search first, pgvector optional
- **Date:** 2026-09-28
- **Decision:** Podcast Brain retrieval uses Postgres `tsvector` full-text search over `knowledge_chunks` now; the table has a nullable pgvector `embedding` column and an `embed_chunks` job type for later.
- **Context:** Brief allows text search + structured extraction first; embeddings must not be required for the app to work.
- **Alternatives:** Embeddings from day one (requires an embedding provider per customer); external vector DB.
- **Choice:** Lexical + structured extraction with citations; vector search added behind the same retrieval interface.
- **Rationale:** Works with no AI provider at all; pgvector lives in the same database, so no new service later.
- **Implications:** Retrieval interface returns chunks with source metadata regardless of backend. Hybrid ranking is a V2 task.

## ADR-009: Connected to the Funneling Media platform via GoHighLevel CRM adapter
- **Date:** 2026-09-28
- **Decision:** Customers are identified by email + `ghl_contact_id`. GoHighLevel is the `crm` capability adapter: V1 ships a mock plus a thin real client (contact upsert by email; tags `podcasting-gg:signed-up`, `onboarding-complete`, `first-episode-complete`, `top-1-percent`). The reusable client moves to `/platform/gohighlevel` when a second product needs it.
- **Context:** Repo rule: every product is connected unless declared standalone; `platform/` pieces (GHL, accounts, billing) are still "planned".
- **Alternatives:** Build the client in `platform/` immediately; skip CRM until billing exists; per-customer GHL connections.
- **Choice:** Product-local adapter today behind the capability interface, with platform-level credentials (`GHL_API_KEY`, `GHL_LOCATION_ID`), designed to be lifted out unchanged.
- **Rationale:** Avoids building platform infrastructure speculatively while keeping the contract (email identity, `<product>:<event>` tags) exactly as `docs/platform.md` requires.
- **Implications:** No product-local "master" copy of contact details. Shared login/billing slot in later because identity is already email-based. Customers never need their own GHL account.

## ADR-010: Design tokens + restyled shadcn primitives
- **Date:** 2026-09-28
- **Decision:** Tailwind v4 with a semantic token system in `src/app/globals.css` (light and dark); shadcn-style primitives copied into `src/components/ui` and restyled to our tokens, density and typography (Geist).
- **Context:** Brief wants Linear/Stripe/Vercel-level polish, excellent dark mode, no "untouched shadcn starter" look, no gradients/glassmorphism.
- **Alternatives:** Full component library (MUI, Mantine); unstyled Radix only; a custom system from scratch.
- **Choice:** Radix-based primitives owned in-repo, tokens as the single source of visual truth.
- **Rationale:** Accessibility for free from Radix, full visual control, no dependency on a library's opinions.
- **Implications:** Colors/spacing/radii only via tokens; new primitives follow the existing pattern; tables for dense data, kanban for pipelines, drawers for contextual editing.

## ADR-011: 20-episode milestone logic lives in domain config, not UI
- **Date:** 2026-09-28
- **Decision:** Episode completion requirements and the five milestones (Launch, Consistent, Authority, Network Builder, Top 1%) are defined as data + pure functions in `src/domain/milestones`, unit tested; UI only renders the result.
- **Context:** Brief section 15: visible mechanic, configurable, must not count mere uploads, must reflect quality, consistency, distribution, relationships, follow-up and outcomes.
- **Alternatives:** Compute progress in components; store milestone rules per workspace in the DB from day one.
- **Choice:** Single domain config with transparent inputs per milestone; per-workspace overrides are a later, additive change.
- **Rationale:** Rules can be tuned in one place with tests; every score shown to a user can list its inputs (no opaque numbers).
- **Implications:** Mission Control, progress widgets and GHL milestone tags (`first-episode-complete`, `top-1-percent`) all call the same functions.
