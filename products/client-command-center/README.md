# Client Command Center

**Status:** Building

## What it does
The internal fulfillment system for Funneling Media's high-ticket clients. It stores each client's approved scope as an unchangeable snapshot, tracks every deliverable version with its source and QA evidence, records classified client feedback against the contract's revision allowance, and unlocks the next package only after an exact version is approved with evidence.

## Who it's for
The owner (Nik), admins and the Client Success Manager. Clients have no access yet.

## Where it lives
- Code: `products/client-command-center/` in `Funneling-media/saas`
- Live website: not deployed
- Hosting / accounts used: none configured yet. Needs a Supabase project and a Next.js host (for example Vercel with Root Directory set to `products/client-command-center`).

## What works today (fixture-tested only)
- Organizations, memberships (owner / admin / CSM / viewer) and row-level security on every table.
- Clients with the seven-stage account pipeline. Stage changes are owner/admin only and need a reason.
- Fulfillment activation (owner/admin, signed-contract stage required) that snapshots the webinar-engine v2 template (nine serial stages) into the client's scope.
- Revision allowance taken from the contract at activation. Blank means "unknown, review required"; nothing defaults to three.
- Deliverable versions that must carry a SHA-256 or a provider asset ID.
- Source evidence (with provenance) and QA evidence (checklist version, pass/fail/waived) per version.
- Classified feedback that counts revision rounds and flags "over allowance" or "allowance unknown" without billing or blocking.
- Approval bound to the exact version and hash, idempotent, which unlocks only the dependent package.
- Append-only audit trail, versions, evidence, feedback, approvals and scopes (database triggers reject edits and deletes).
- Truthful integrations page: no provider is connected.

See [`docs/capability-truth-matrix.md`](docs/capability-truth-matrix.md) for what is and isn't verified.

## Run it

```bash
npm install
npm run test:db     # starts a throwaway Postgres 15+ and runs the RLS/workflow tests
npm run verify      # typecheck, lint, database tests, production build
```

To run the UI you need a Supabase project:

1. Create a Supabase project, link it with the Supabase CLI and apply the migrations: `supabase link` then `supabase db push`.
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key. No secret keys are needed.
3. In Supabase Auth, invite each team member by email. In **Authentication → Email Templates → Magic Link**, make the link point to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
4. Create the organization and first owner in the SQL editor (runs as an administrator):

   ```sql
   insert into public.organizations (name) values ('Funneling Media') returning id;
   insert into public.memberships (org_id, user_id, role)
   values ('<org id from above>', (select id from auth.users where email = '<owner email>'), 'owner');
   ```

5. `npm run dev`, sign in, and create a client marked **Internal test** first.

## Never put in Git
Client names, emails, phone numbers, payment records, contracts, transcripts, `.env` files or keys. The client list spreadsheet stays in Google Drive until the import slice loads it into Supabase.

## Notes
- All writes go through database functions (`supabase/migrations/`) that check the caller's role. The app has no direct table-write access, so the rules hold for any future integration too.
- Migrations are forward-only. Never edit one that has been applied; add a new file.
- Next steps and open decisions: [`docs/fulfillment-core.md`](docs/fulfillment-core.md) and [`docs/client-sheet-import-plan.md`](docs/client-sheet-import-plan.md).
