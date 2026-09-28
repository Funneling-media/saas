# Deployment

**Plain-English summary.** Going live means: one Supabase project (database, login,
files) and one Vercel project (the website), connected by a handful of settings. We
deploy only after the local V1 loop is stable. This page is the checklist for when that
day comes, plus how to undo a bad release.

**Status:** not deployed yet. Local-first per the brief.

## Target
- App: Vercel (Next.js 16, Node 20 runtime)
- Database / Auth / Storage: Supabase (single production project; a separate staging
  project is optional but recommended before real customers)
- Repo: GitHub (`main` = production, preview deploys per PR)
- Background jobs: Vercel Cron pinging `/api/jobs/work` every minute (protected by a
  secret header) until we move to Inngest/Trigger.dev (ADR-005)

## Steps

1. **Create the Supabase production project.** Region close to customers. Enable
   email/password auth; set Site URL and redirect URLs to the production domain.
2. **Apply migrations.**
   ```bash
   cd products/podcasting-gg/app
   pnpm dlx supabase link --project-ref <prod-ref>
   pnpm dlx supabase db push
   ```
   Do not seed demo data in production.
3. **Create the Vercel project** from the GitHub repo, root directory
   `products/podcasting-gg/app`, framework Next.js, package manager pnpm, build
   `pnpm build`.
4. **Set environment variables** in Vercel (Production and Preview):

   | Variable | Notes |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public |
   | `SUPABASE_SERVICE_ROLE_KEY` | server only; jobs and seeding |
   | `NEXT_PUBLIC_APP_URL` | `https://app.podcasting.gg` (or the Vercel URL) |
   | `CREDENTIAL_ENCRYPTION_KEY` | 32+ chars; losing it makes stored provider keys unreadable; keep in a password manager |
   | `GHL_API_KEY`, `GHL_LOCATION_ID` | Funneling Media GoHighLevel; enables real CRM adapter |
   | `JOBS_CRON_SECRET` | random; Vercel Cron sends it to `/api/jobs/work` (add to `.env.example` when the route ships) |
   | `AI_DEFAULT_*` | leave unset in production; customers connect their own AI |

5. **Add the cron** in `vercel.json`: `{"crons":[{"path":"/api/jobs/work","schedule":"* * * * *"}]}`.
6. **Point the domain** (`app.podcasting.gg`) at Vercel; add it to Supabase Auth redirect URLs.
7. **Deploy** by merging to `main`.

## Migrations in production
- Migrations are plain SQL in `supabase/migrations`, applied with `supabase db push`
  from CI or a developer machine linked to the prod project. Never edit an applied
  migration; add a new one.
- Every migration must be safe to run while the previous app version is live
  (add columns as nullable, backfill, then tighten in a later migration).
- Run `pnpm db:local:test` in CI before any deploy so RLS regressions cannot ship.

## What to verify after each deploy
- [ ] `/login` loads; sign up with a fresh email works; confirmation email arrives
- [ ] New user creates org/workspace and completes onboarding
- [ ] GoHighLevel shows the contact with `podcasting-gg:signed-up`
- [ ] Settings → AI: adding a key stores it, browser never receives it (check network tab)
- [ ] A transcript analysis job goes queued → completed (cron is running)
- [ ] RLS spot check: user A cannot load user B's workspace URL (404/redirect)
- [ ] Integrations page shows real/mock/manual/planned labels correctly; nothing shows fake analytics
- [ ] Light and dark mode, mobile viewport, `/setup` never appears in production

## Rollback
- **App:** Vercel → Deployments → promote the previous deployment (instant). Env var
  changes are also versioned there.
- **Database:** migrations are forward-only. For a bad migration, write a new
  corrective migration; for data damage, use Supabase's point-in-time recovery /
  daily backups (enable on the Pro plan before real customers). Keep destructive
  changes (drop column, drop table) two releases behind the code that stopped using them.
- **Credentials:** if `CREDENTIAL_ENCRYPTION_KEY` is compromised, rotate it with the
  re-encrypt script (V2) and mark all provider connections `reauth_required`.

## Later
Sentry for errors, structured logs, a staging Supabase project, Inngest/Trigger.dev for
jobs, shared login and billing from `platform/` (see [`../../../platform/README.md`](../../../platform/README.md)).
