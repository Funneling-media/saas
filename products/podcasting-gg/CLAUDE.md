# Working on this product

## Repo rules (apply to every product)
- This product is self-contained. Only change files inside this folder unless
  the task is explicitly about `shared/` or the repo-wide docs.
- Check the **Connection** line in `README.md`. If connected (the default), use
  `platform/` for login, billing, customer records and GoHighLevel. Never build
  those inside this product. See `docs/platform.md`.
- Never import code from another product's folder. Products connect only through
  `platform/`; other reusable code goes in `shared/`.
- Read `PRODUCT.md` before building a feature; if a request contradicts it,
  update `PRODUCT.md` in the same change so the plan stays true.
- Code lives in `app/`. Its dependencies are installed there, not at the repo root.
- Secrets go in `app/.env.local` (never committed). List every new setting's name in `app/.env.example`.
- Keep the Status line in `README.md` and the row in `products/README.md` current.

## Read first
1. `PRODUCT.md` (what we're building and the V1 loop)
2. `docs/DECISIONS.md` (settled choices; don't reopen them without new evidence)
3. `docs/ARCHITECTURE.md` for the layer rules below in detail; `docs/DATABASE.md` before touching schema.
4. `docs/SPEC.md` only when you need the founder's original wording.

## Product-specific rules
- **Layers are one-directional:** `components` → `services` → `db` / `adapters` / `jobs` / `ai`;
  `domain` depends on nothing. No provider or Supabase logic inside React components.
- **Domain is pure and tested.** Business rules, Zod schemas, state machines, the
  20-episode milestone config, opportunity types and roles/permissions live in
  `app/src/domain` with unit tests. No I/O there.
- **Statuses change only through domain transition functions** (e.g. the episode status
  machine). Never write a status column directly from a component or service.
- **Every adapter capability has a mock.** A new provider goes in
  `app/src/adapters/<capability>/` behind the capability interface, with the mock
  updated if the interface changed. The app must run with zero credentials.
- **Label every integration honestly:** real / mock / manual / planned, in code, in the
  Integrations UI and in `docs/INTEGRATIONS.md`. Never call something "integrated"
  because a button exists.
- **Never fake analytics.** Unconnected providers show "not connected", not numbers.
- **AI output is editable and never authoritative.** Store provenance
  (`generated_by`, `edited_at`); never overwrite user-edited content without an explicit
  user action. Structured AI outputs are validated with Zod. No provider SDK calls
  outside `app/src/ai` and `app/src/adapters/ai`.
- **Consequential external actions require approval** (sending outreach, publishing).
  AI may do research, drafts, extraction and classification on its own.
- **Long work goes to background jobs** (`app/src/jobs`), never inside a page request.
- **Every tenant table** has `organization_id` + `workspace_id`, RLS enabled, and policies
  built on `is_org_member` / `has_org_role`. Add an RLS test when adding a table.
- **Secrets never reach the browser.** Customer credentials are encrypted with
  `CREDENTIAL_ENCRYPTION_KEY` (AES-256-GCM) and only decrypted server-side. Never log them.
- **No billing, credits or Stripe in V1.** Leave extension points, don't build them.
- **Definition of done:** happy, empty, loading, error and validation states; authorization;
  persistence; responsive layout; tests. Run `pnpm check` (lint + typecheck + unit tests)
  and `pnpm db:local:test` (migrations + RLS tests) before claiming anything is done.
- **Record consequential choices** as a new ADR in `docs/DECISIONS.md` and update the
  affected doc in the same change. The repo, not chat history, is the source of truth.
- Write for a non-technical owner in `README.md`, `PRODUCT.md` and summaries; technical
  docs get a plain-English summary at the top.
