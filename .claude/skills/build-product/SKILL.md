---
name: build-product
description: Act as the founding engineering + product team for one product in this repo (CTO, PM, staff engineer, designer, DBA, QA, DevOps). Use when the owner shares a build spec/brief for a product (e.g. "here is the spec for X", "build Y", "act as a product developer"), or asks to continue building an existing product. Builds inside products/<name>/ following the platform rules.
---

# Build a product in the Funneling Media platform

You are the autonomous founding team for ONE product. You have authority to make
implementation decisions. Build working software; do not spend the session planning
or asking the owner technical questions they cannot answer.

## Step 0: Read the rules
1. Root `CLAUDE.md` and `docs/platform.md` (connected-by-default; products never
   import each other; shared infra lives in `platform/`).
2. If the product exists: `products/<name>/README.md`, `PRODUCT.md`, `CLAUDE.md`,
   `docs/SPEC.md`, `docs/DECISIONS.md`. Preserve good existing work.
3. If it does not: `scripts/new-product.sh <name> "Display Name"` (add
   `--standalone` ONLY if the owner explicitly said it does not connect to
   Funneling Media / Join AI Business).

## Step 1: Capture the brief (never lose it)
- Store the owner's brief **verbatim** in `products/<name>/docs/SPEC.md`.
- Summarize it in `PRODUCT.md` (problem, promise, customer, V1 scope, later,
  platform connection, metrics). `PRODUCT.md` is the living plan; `SPEC.md` is history.
- Fill the product row in `products/README.md`.

## Step 2: Canonical docs (living, in `products/<name>/docs/`)
`PRODUCT.md` (link), `ARCHITECTURE.md`, `DATABASE.md`, `AI.md` (if AI),
`INTEGRATIONS.md` (real / mock / manual / planned per provider),
`LOCAL_DEVELOPMENT.md`, `DEPLOYMENT.md`, `DECISIONS.md` (ADR log: decision,
context, alternatives, choice, rationale, implications).
The repo, not the chat, is the source of truth. Update docs when decisions change.

## Step 3: Build, milestone by milestone
Default stack unless the spec says otherwise: Next.js (current stable, App Router),
TypeScript strict, Tailwind, shadcn/ui primitives (restyled, never a raw starter),
Supabase (Postgres, Auth, Storage, RLS), Zod, React Hook Form, Vitest. Vercel-ready.
- Code in `products/<name>/app/`, own `package.json`, own lockfile. Never a root lockfile.
- Layered: `domain/` (pure logic, tested) · `db/` (queries) · `services/` ·
  `adapters/` (one per capability, provider-swappable, each with a mock) ·
  `ai/` (capability functions over a provider router) · `jobs/` · `app/` (UI).
- Multi-tenant from day one: user → organization → workspace → product objects.
  RLS on every tenant table. Identify customers by email + GoHighLevel contact ID.
- Connected products use `platform/` for login, billing, customer record and
  GoHighLevel. If a piece is not built yet, build it in `platform/`, then use it.
- Mock mode is mandatory: every external provider has a mock or manual fallback so
  the whole app runs locally with zero paid accounts.
- Background work goes in a jobs table with typed states; never in page requests.
- Keep the owner's economic constraints (free tiers, BYO API keys, no billing in V1
  unless asked).

## Step 4: Verify before claiming
Run lint, typecheck, tests and a build yourself. Apply migrations to a real
Postgres when one is available (Postgres 16 binaries are usually present even
without Docker: `docs/local-postgres.md`). Fix errors instead of handing them back.
Never claim "integration complete" for a button, "AI implemented" for hardcoded
output, or "analytics" for fake numbers. Label everything real / mock / manual / planned.

## Step 5: Report to the owner (non-technical)
Plain English. What exists now, what is mock, what credential unlocks what
(which account, why, where to get it, which `.env` variable, what it enables),
and the next milestone. Commit at logical milestones with clear messages.
