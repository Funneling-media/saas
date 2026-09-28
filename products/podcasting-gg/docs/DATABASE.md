# Database

Postgres (Supabase in production, plain Postgres 16 locally). Schema lives in
`app/supabase/migrations/`, demo data in `app/supabase/seed.sql`, and the local
runner in `app/scripts/db-local.sh`.

## Tenant model

```
auth.users ──1:1── profiles
     │
     └── organization_members (role: owner | admin | member | viewer)
              │
        organizations ──1:N── workspaces ──1:N── podcasts ──1:N── episodes
                                   │
                                   └── every product table (contacts, guests,
                                       transcripts, opportunities, tasks, ...)
```

* A **user** can belong to many organizations; membership carries a role.
* An **organization** is the billing/permission boundary. Roles are checked at
  the organization level; there are no per-workspace roles in v1.
* A **workspace** is a brand inside an organization. Every product row carries
  **both** `organization_id` and `workspace_id`. A trigger
  (`enforce_workspace_org`) rejects rows whose workspace does not belong to the
  stated organization, so the two can never disagree.
* The creator of an organization is inserted as its `owner` automatically
  (trigger `add_creator_as_owner`), and a new `auth.users` row gets a `profiles`
  row automatically (trigger `handle_new_user`).

Soft delete (`deleted_at`) exists on organizations, workspaces, podcasts,
contacts and episodes. Everything else is hard-deleted with cascading FKs.

## Tables

### Foundation (`0001_foundation.sql`)

| Table | Purpose |
| --- | --- |
| `profiles` | Public mirror of `auth.users`: name, avatar, onboarding state, optional GoHighLevel contact id. |
| `organizations` | Tenant root. Unique slug, creator, soft delete. |
| `organization_members` | User ↔ organization with a role (`org_role`). |
| `workspaces` | Brand/workspace inside an organization. `settings` JSON holds per-workspace config (milestone thresholds, timezone). |
| `audit_logs` | Append-only activity history for important actions (`action`, `entity_type`, `entity_id`, metadata). |
| `background_jobs` | Durable job queue: kind, `job_status`, payload/result, attempts, idempotency key, related entity, provider, `run_after`. |
| `notifications` | Per-user in-app notifications. Strictly private to the recipient. |

### Product domain (`0002_core_domain.sql`)

| Table | Purpose |
| --- | --- |
| `podcasts` | A show inside a workspace: format, medium, cadence, target episode count (20 Episode System), host/guest mode flags. |
| `podcast_strategies` | One strategy per podcast: positioning, promise, pillars, guest archetypes, roadmap, metrics. `generated_by` = `ai` or `user`. |
| `brand_kits` | One per workspace: colors, fonts, tone, voice guidelines, prohibited phrases, CTA, social handles. |
| `founder_profiles` | One per workspace: the founder's onboarding answers (bio, offer, ICP, goals, ideal guest, guest positioning). |
| `contacts` | Every person the workspace knows. Single source of truth for people; guests and relationships point here. |
| `relationships` | Relationship CRM layer on a contact: category, strength 0–100, last interaction, next follow-up, direct/influenced revenue. |
| `interactions` | Timeline entries on a contact (email, call, recording, LinkedIn, ...). |
| `guests` | Guest pipeline record: contact × podcast with `guest_stage`, fit score and breakdown, consent snapshot. |
| `guest_research` | AI or human research dossiers for a guest (summary, facts, suggested questions, sources). |
| `outreach_messages` | Outbound/inbound outreach per contact (email, LinkedIn); status gates through approval before send. |
| `episodes` | Episode record with `episode_status`, dates, media URLs, show notes, chapters, keywords, `completion` checklist JSON. |
| `episode_guests` | Episode ↔ guest join. |
| `interview_briefs` | Prep brief per episode (JSON content) with `approval_status`. |
| `transcripts` | First-class transcript: language, source, `transcript_status`, full text, word count. |
| `transcript_segments` | Timestamped, speaker-labelled segments of a transcript, ordered by `idx`. |
| `knowledge_chunks` | Podcast Brain index: chunked text from any source with a `tsvector` column, plus an optional `embedding` (see pgvector). |
| `quotes` | Extracted quotable lines with timestamp, speaker contact and tags. |
| `topics` / `episode_topics` | Workspace topic vocabulary and episode tagging. |
| `content_assets` | Clips, shorts, social posts, titles, show notes, thumbnails, etc. (`content_asset_type`). |
| `opportunities` | Opportunity Engine output: type, status, verbatim `evidence_excerpt` + timestamp, confidence, value, owner, next action. |
| `tasks` | Central task list with links to contact, guest, episode and opportunity. |
| `approvals` | Approval Center inbox: polymorphic (`entity_type`, `entity_id`) with `approval_status`. |
| `provider_connections` | Bring-your-own provider connections per capability (AI, CRM, recording, ...). Credentials are stored encrypted, never returned to the browser. |
| `publishing_destinations` | Where a podcast publishes (RSS host, YouTube, ...) and which connection to use. |
| `publishing_jobs` | One publish attempt per episode × destination with `publishing_status`, external id/url, error, attempts. |
| `target_podcasts` | Guest mode: shows the founder wants to appear on, with research and pitch status. |
| `guest_releases` | Consent/release record per guest (recording, publishing, editing, promo reuse, AI processing) with acceptance evidence. |
| `revenue_events` | Direct or influenced revenue attributed to a contact, opportunity or episode. |

Every product table has indexes on `workspace_id`, `organization_id`, its
foreign keys, and `(workspace_id, status)` where a status exists. `contacts`,
`episodes` and `quotes` carry a generated `search_vector` with a GIN index for
lexical search.

## Enum vocabularies

These are Postgres enums and are mirrored one-to-one in the TypeScript domain
layer. Do not rename or reorder values; add new ones with
`alter type ... add value`.

| Enum | Values |
| --- | --- |
| `org_role` | owner, admin, member, viewer |
| `job_status` | queued, running, waiting, completed, failed, retrying, cancelled |
| `podcast_format` | interview, solo, hybrid |
| `podcast_medium` | video, audio |
| `guest_stage` | prospect, researched, approved, ready_to_contact, contacted, replied, interested, booking, booked, preparation, recorded, production, published, follow_up, relationship |
| `episode_status` | idea, research, booked, preparation, recording, editing, review, approval, publishing, repurposing, distribution, follow_up, complete |
| `opportunity_type` | sales, referral, introduction, partnership, sponsorship, speaking, hiring, investment, collaboration, media, content, other |
| `opportunity_status` | detected, accepted, in_progress, won, lost, dismissed |
| `task_status` | todo, in_progress, done, cancelled |
| `task_priority` | low, medium, high, urgent |
| `approval_status` | pending, approved, rejected, changes_requested |
| `provider_status` | disconnected, connecting, connected, degraded, error, reauth_required |
| `provider_capability` | ai, crm, recording, hosting, research, enrichment, email, calendar, social_publishing, analytics, transcription |
| `relationship_category` | guest, host, partner, sponsor, investor, client, prospect, referral_source, mentor, friend, event_organizer, recruit, introducer |
| `content_asset_type` | episode, transcript, clip, short, quote, framework, story, thumbnail, social_post, show_notes, email, hook, title, description, cta, document, generated |
| `publishing_status` | draft, scheduled, publishing, published, failed, manual |
| `transcript_status` | pending, processing, ready, failed |

A few small vocabularies are plain `text` with a `check` constraint rather than
an enum, because they are likely to change: `outreach_messages.channel /
direction / status`, `publishing_destinations.kind`, `target_podcasts.status`,
`revenue_events.kind`, and the `generated_by` / `detected_by` columns
(`ai` | `user`).

## Row Level Security

RLS is enabled on every table. Policies never inspect membership directly;
they call three `security definer` helpers in `public` that read
`organization_members` without recursing into RLS:

| Function | Returns |
| --- | --- |
| `is_org_member(org uuid)` | true if `auth.uid()` is a member of `org` |
| `org_role(org uuid)` | the caller's `org_role` in `org`, or null |
| `has_org_role(org uuid, min org_role)` | true if the caller's role is at least `min` (owner > admin > member > viewer) |

Policy shape:

* **Product tables** (everything in `0002`): members may `select`; members
  (`has_org_role(..., 'member')`, so viewers are excluded) may `insert` and
  `update`; admins and owners may `delete`.
* **organizations**: members select; admin+ update; owner delete; any
  authenticated user may insert an org where `created_by = auth.uid()` (the
  trigger then makes them owner).
* **organization_members** and **workspaces**: members select; admin+ write.
* **profiles**: you can read and update your own; you can read profiles of
  people who share an organization with you.
* **audit_logs**: members select and insert (append-only; no update/delete
  policy).
* **background_jobs**: members select; admin+ write. The worker uses the
  service role.
* **notifications**: only the recipient can read, update or delete. There is no
  insert policy for `authenticated`; notifications are created server-side with
  the service role.

`service_role` bypasses RLS (Supabase default). `authenticated` gets table
grants but is fenced by the policies above. Use the service role only in
trusted server code (job runner, webhooks), never in a browser-facing client.

The tenant-consistency trigger is a second line of defence: even a service-role
insert cannot attach a workspace to the wrong organization.

## Local development

No Docker. `scripts/db-local.sh` runs a throwaway Postgres 16 from
`/usr/lib/postgresql/16/bin` with data in `app/.pg-local/` (git-ignored), on
port `54329`, unix socket in `/tmp`, trust auth. If run as root it drops to the
`postgres` OS user.

```bash
cd app
bash scripts/db-local.sh start   # initdb (first time), start, create db, apply shim + migrations + seed
bash scripts/db-local.sh reset   # drop and rebuild the database from scratch
bash scripts/db-local.sh test    # reset, then run supabase/local/rls_tests.sql
bash scripts/db-local.sh psql    # open psql (extra args pass through)
bash scripts/db-local.sh stop
```

Connection string: `postgresql://postgres@localhost:54329/podcasting_gg`.

What `reset` applies, in order:

1. `supabase/local/auth_shim.sql` – a stand-in for Supabase's `auth` schema:
   the `anon` / `authenticated` / `service_role` roles, a minimal `auth.users`
   table, and `auth.uid()` / `auth.role()` / `auth.jwt()` reading the
   `request.jwt.claim.*` session settings exactly as PostgREST sets them.
   **Local only. Never apply this to a Supabase project.**
2. `supabase/migrations/*.sql` in filename order.
3. `supabase/seed.sql`.

### Demo data

The seed is idempotent (fixed UUIDs, `on conflict do nothing`) and creates:

* Auth user `demo@podcasting.gg` / `demo1234` (Alex Rivera), organization and
  workspace **Acme Advisory**, podcast **The Founder Growth Show**, a founder
  profile, strategy and brand kit.
* Six contacts, five guests across pipeline stages, five episodes from `idea`
  to `complete`.
* Episode 7 (`complete`) has a full 29-segment interview transcript with
  Elena Vasquez of Northwind Staffing, from which four `detected` opportunities
  (introduction, sales, speaking, partnership) were extracted. Each
  `evidence_excerpt` is verbatim from the transcript with its `start_ms`.
* Three quotes, topics, content assets, six tasks (two due today, two upcoming,
  two done, relative to `current_date`), two pending approvals, three
  disconnected provider connections (AI, GoHighLevel, Riverside), mock
  publishing destinations/jobs, a guest release, a revenue event, background
  jobs, audit logs and a notification.

### RLS tests

`supabase/local/rls_tests.sql` runs as superuser, creates a second user and
organization plus a viewer in org 1, then impersonates each user with
`set role authenticated; set request.jwt.claim.sub = '<uuid>'` and asserts in
`do` blocks (which `raise exception` on failure) that:

* the demo user sees their own org, podcasts, episodes and contacts but no
  org-2 rows, can insert into their own org, and cannot insert into org 2 or
  mix org 1 with an org-2 workspace;
* user 2 sees nothing from org 1 across all tenant tables, cannot insert into
  org 1 (podcasts, contacts, workspaces, members), cannot add themselves to
  org 1, and cross-tenant update/delete affect zero rows;
* notifications are visible only to their recipient and cannot be inserted by
  `authenticated`;
* a viewer can read but not insert or delete; an owner can delete;
* profiles are visible only to self and org-mates.

The script prints `RLS tests passed` on success. `bash scripts/db-local.sh
test` exits non-zero on any failure.

## pgvector is optional

Semantic search must never take the app down. Both migrations guard pgvector:

* `0001` runs `create extension if not exists vector` inside a `do` block that
  catches the error and prints a notice when the extension is not installed.
* `0002` adds `knowledge_chunks.embedding vector(1536)` and an HNSW cosine
  index only if `pg_extension` reports `vector`. Otherwise the column simply
  does not exist.

`knowledge_chunks.content_tsv` (a generated `tsvector` with a GIN index) is
always present, so lexical search works everywhere. Application code should
check for the `embedding` column (or catch the undefined-column error) and fall
back to `content_tsv` when embeddings are unavailable. On Supabase, enable the
`vector` extension before running migrations to get the embedding column.

## Conventions for new tables

* UUID primary key with `gen_random_uuid()`, `created_at`, `updated_at`, and
  the `set_updated_at` trigger.
* Product tables carry `organization_id` and `workspace_id` (both `not null`,
  cascading FKs) and are added to the `tenant_tables` array at the bottom of
  the domain migration so they receive the standard indexes, tenant trigger
  and RLS policies automatically.
* Controlled vocabularies are enums; mirror any change in the TypeScript
  domain layer.
* Never store plaintext secrets. `provider_connections.encrypted_credentials`
  holds ciphertext produced server-side.
