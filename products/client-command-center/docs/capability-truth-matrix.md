# Capability truth matrix

| Field | Value |
|---|---|
| Audit date | 2026-09-28 |
| Repository | `Funneling-media/saas`, folder `products/client-command-center/` |
| Branch | `claude/client-fulfillment-system-hp5om1` |
| Base commit | `9ba3865` (hub setup). The application was built from scratch on this branch. |
| Deployment | None. Unknown: no hosting access supplied. |
| Supabase project | None. Unknown: no project access supplied. |
| Backups / restore | Not configured. Unknown until a Supabase project exists. |
| Provider accounts | Unknown: access not supplied. |

## Prior-code audit
The handoff prompt described an existing `client-command-center/` app with migrations `0001`–`0008`. It was not found in `nikhilsaiaadi/test1`, `Funneling-media/saas` (both branches) or `nikhilsaiaadi/businesscontent`. A Codex session may have produced it elsewhere; nothing from it is reused. The founder chose to rebuild from scratch here.

## Matrix

Columns: **Code**: exists on this branch. **Configured**: running against a real provider/project. **Fixture tested**: automated tests against local fixtures pass. **E2E**: exercised end-to-end in a deployed environment. **Real-client safe**: meets every threshold in the "real-client safe" definition below.

| Capability | Evidence | Code | Configured | Fixture tested | E2E | Real-client safe | Next gap |
|---|---|---|---|---|---|---|---|
| Org memberships, roles, RLS | `supabase/migrations/20260928000001_foundation.sql`, `tests/db` | Yes | No | Yes (Postgres 16) | No | No | Apply to a Supabase project; verify auth + backups |
| Clients + seven-stage pipeline (paused = `inactive` + reason) | same | Yes | No | Yes | No | No | UI stage history view |
| Append-only audit trail | same | Yes | No | Yes | No | No | Owner-facing audit viewer |
| Immutable scope snapshot at activation | `…000002_fulfillment_scope_and_approvals.sql` | Yes | No | Yes | No | No | Additional templates for existing programs |
| Contract-sourced revision allowance (unknown by default, owner amendments) | same | Yes | No | Yes | No | No | Confirm terms per client |
| Deliverable versions with hash / provider asset ID | same | Yes | No | Yes | No | No | File upload + automatic hashing |
| Source + QA evidence per version | same | Yes | No | Yes | No | No | QA checklist content (versioned) |
| Classified feedback + revision counting | same | Yes | No | Yes | No | No | Client-facing revision form |
| Exact-version approval, idempotent, unlocks dependents | same | Yes | No | Yes | No | No | Client reviewer identity / signed review links |
| Web UI (owner/admin/CSM/viewer) | `src/app` | Yes | No | Build + route smoke test only | No | No | Browser test against a real Supabase project |
| Email magic-link sign-in (invite-only) | `src/app/login`, `src/app/auth/confirm` | Yes | No | Redirect smoke test only | No | No | Supabase Auth configuration |
| Webinar-engine v2 template (9 stages) | `…000003_seed_webinar_engine_v2_template.sql` | Yes | No | Yes | No | No | Founder review of stage wording |
| Client sheet import (Google Sheets) | `docs/client-sheet-import-plan.md` | No | No | No | No | No | Next slice |
| Stripe / Whop / Commas reconciliation | none | No | No | No | No | No | Read-only slice after import |
| Wispr / Fathom memory | none | No | No | No | No | No | Candidate matching with review |
| Google Drive provisioning | none | No | No | No | No | No | Idempotent folder job |
| GoHighLevel onboarding | none | No | No | No | No | No | Invite + completion callback |
| Slack reminders | none | No | No | No | No | No | Draft-for-approval |
| WhatsApp | none | No | No | No | No | No | Opt-in and templates |
| HeyGen video | none | No | No | No | No | No | Avatar/voice consent |
| Kimi / Canva / media production | none | No | No | No | No | No | Manual upload first |

## Real-client safe: current gaps for the built slice
All must be evidenced before real client data is entered:

- [ ] Authenticated production data path (Supabase project + deployed app). **Missing.**
- [x] Tenant isolation tested (cross-org reads return nothing; cross-org commands rejected).
- [x] Role authorization tested (owner / admin / CSM / viewer / outsider / anonymous).
- [x] Audit history for every command.
- [x] Idempotency for activation and approval.
- [ ] Backup and restore ownership verified. **Missing.**
- [x] No secrets in code; the app uses only the public URL and publishable key.
- [x] Clear failure behavior: every rejected command returns its reason to the UI.
- [ ] Controlled release and rollback path (preview deployment, migration rollback plan). **Missing.**

## Verification commands (2026-09-28, this container)

| Command | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass (no findings) |
| `npm run test:db` | 26 tests, 26 pass (throwaway Postgres 16 with a Supabase role/auth shim) |
| Guard check: two safety checks deliberately disabled | 2 tests failed as expected, then restored |
| `npm run build` | Pass (Next.js 16.3.6, all routes dynamic) |
| `next start` smoke test | Unconfigured → `/setup`; signed-out → `/login?next=…`; bad sign-in link → login error |

Not run: browser tests against a real Supabase Auth server (none available), accessibility audit tooling, cross-browser checks.
