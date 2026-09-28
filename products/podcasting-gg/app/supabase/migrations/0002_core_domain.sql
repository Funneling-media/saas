-- 0002_core_domain.sql
-- Product tables for Podcasting.gg. Every table here is scoped to BOTH an
-- organization and a workspace. The tail of this file applies, uniformly to
-- every tenant table:
--   * index on (workspace_id)
--   * updated_at trigger
--   * tenant consistency trigger (workspace must belong to organization)
--   * RLS: member select / member insert+update / admin+ delete

-- ---------------------------------------------------------------------------
-- Enums (values mirrored by the TypeScript domain layer; do not reorder/rename)
-- ---------------------------------------------------------------------------
create type public.podcast_format as enum ('interview', 'solo', 'hybrid');
create type public.podcast_medium as enum ('video', 'audio');

create type public.guest_stage as enum (
  'prospect', 'researched', 'approved', 'ready_to_contact', 'contacted', 'replied',
  'interested', 'booking', 'booked', 'preparation', 'recorded', 'production',
  'published', 'follow_up', 'relationship'
);

create type public.episode_status as enum (
  'idea', 'research', 'booked', 'preparation', 'recording', 'editing', 'review',
  'approval', 'publishing', 'repurposing', 'distribution', 'follow_up', 'complete'
);

create type public.opportunity_type as enum (
  'sales', 'referral', 'introduction', 'partnership', 'sponsorship', 'speaking',
  'hiring', 'investment', 'collaboration', 'media', 'content', 'other'
);

create type public.opportunity_status as enum (
  'detected', 'accepted', 'in_progress', 'won', 'lost', 'dismissed'
);

create type public.task_status as enum ('todo', 'in_progress', 'done', 'cancelled');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

create type public.approval_status as enum (
  'pending', 'approved', 'rejected', 'changes_requested'
);

create type public.provider_status as enum (
  'disconnected', 'connecting', 'connected', 'degraded', 'error', 'reauth_required'
);

create type public.provider_capability as enum (
  'ai', 'crm', 'recording', 'hosting', 'research', 'enrichment', 'email',
  'calendar', 'social_publishing', 'analytics', 'transcription'
);

create type public.relationship_category as enum (
  'guest', 'host', 'partner', 'sponsor', 'investor', 'client', 'prospect',
  'referral_source', 'mentor', 'friend', 'event_organizer', 'recruit', 'introducer'
);

create type public.content_asset_type as enum (
  'episode', 'transcript', 'clip', 'short', 'quote', 'framework', 'story',
  'thumbnail', 'social_post', 'show_notes', 'email', 'hook', 'title',
  'description', 'cta', 'document', 'generated'
);

create type public.publishing_status as enum (
  'draft', 'scheduled', 'publishing', 'published', 'failed', 'manual'
);

create type public.transcript_status as enum ('pending', 'processing', 'ready', 'failed');

-- ---------------------------------------------------------------------------
-- Podcast + strategy + workspace-level profiles
-- ---------------------------------------------------------------------------
create table public.podcasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  format public.podcast_format not null default 'interview',
  medium public.podcast_medium not null default 'video',
  category text,
  feed_url text,
  artwork_url text,
  cadence text,
  target_episode_count int not null default 20,
  mode_host boolean not null default true,
  mode_guest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, slug)
);

create table public.podcast_strategies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  positioning text,
  show_promise text,
  target_listener text,
  business_objective text,
  content_pillars jsonb not null default '[]'::jsonb,
  ideal_guest_archetypes jsonb not null default '[]'::jsonb,
  interview_philosophy text,
  cta text,
  distribution_plan text,
  episode_roadmap jsonb not null default '[]'::jsonb,
  relationship_strategy text,
  success_metrics jsonb not null default '[]'::jsonb,
  generated_by text check (generated_by in ('ai', 'user')),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (podcast_id)
);
create index podcast_strategies_podcast_id_idx on public.podcast_strategies (podcast_id);

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  logo_url text,
  colors jsonb not null default '{}'::jsonb,
  fonts jsonb not null default '{}'::jsonb,
  tone text,
  voice_guidelines text,
  prohibited_phrases text[] not null default '{}',
  cta text,
  url text,
  social_handles jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create table public.founder_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text,
  bio text,
  expertise text[] not null default '{}',
  story text,
  credibility text,
  links jsonb not null default '{}'::jsonb,
  business_name text,
  website text,
  industry text,
  business_model text,
  offer text,
  price_range text,
  target_market text,
  ideal_customer text,
  pain_points text,
  differentiation text,
  desired_cta text,
  goals text[] not null default '{}',
  ideal_guest jsonb not null default '{}'::jsonb,
  guest_positioning jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

-- ---------------------------------------------------------------------------
-- People: contacts, relationships, interactions
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  full_name text not null,
  first_name text,
  last_name text,
  email text,
  phone text,
  title text,
  company text,
  bio text,
  website text,
  location text,
  avatar_url text,
  social_urls jsonb not null default '{}'::jsonb,
  expertise text[] not null default '{}',
  audience text,
  tags text[] not null default '{}',
  source text,
  ghl_contact_id text,
  notes text,
  search_vector tsvector generated always as (
    to_tsvector('simple'::regconfig,
      coalesce(full_name, '') || ' ' || coalesce(company, '') || ' ' || coalesce(title, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index contacts_workspace_email_uidx
  on public.contacts (workspace_id, lower(email)) where email is not null;
create index contacts_search_idx on public.contacts using gin (search_vector);
create index contacts_tags_idx on public.contacts using gin (tags);
create index contacts_ghl_idx on public.contacts (ghl_contact_id) where ghl_contact_id is not null;

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  category public.relationship_category not null,
  strength int check (strength between 0 and 100),
  last_interaction_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  revenue_direct numeric(14,2) not null default 0,
  revenue_influenced numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, category)
);
create index relationships_contact_id_idx on public.relationships (contact_id);
create index relationships_follow_up_idx on public.relationships (workspace_id, next_follow_up_at);

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  kind text not null,
  occurred_at timestamptz not null default now(),
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interactions_contact_idx on public.interactions (contact_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Guest pipeline
-- ---------------------------------------------------------------------------
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  stage public.guest_stage not null default 'prospect',
  fit_score int check (fit_score between 0 and 100),
  fit_score_breakdown jsonb not null default '{}'::jsonb,
  source text,
  approved_at timestamptz,
  consent jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (podcast_id, contact_id)
);
create index guests_contact_id_idx on public.guests (contact_id);
create index guests_podcast_stage_idx on public.guests (podcast_id, stage);
create index guests_workspace_stage_idx on public.guests (workspace_id, stage);

create table public.guest_research (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  summary text,
  facts jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  generated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index guest_research_guest_id_idx on public.guest_research (guest_id, created_at desc);

create table public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete set null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email', 'linkedin', 'other')),
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  subject text,
  body text,
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'approved', 'sent', 'replied', 'bounced', 'cancelled'
  )),
  scheduled_for timestamptz,
  sent_at timestamptz,
  generated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outreach_messages_contact_idx on public.outreach_messages (contact_id, created_at desc);
create index outreach_messages_guest_idx on public.outreach_messages (guest_id);
create index outreach_messages_status_idx on public.outreach_messages (workspace_id, status);

-- ---------------------------------------------------------------------------
-- Episodes
-- ---------------------------------------------------------------------------
create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  title text not null,
  description text,
  episode_number int,
  season int,
  status public.episode_status not null default 'idea',
  recording_date timestamptz,
  publish_date timestamptz,
  recording_url text,
  source_media jsonb not null default '{}'::jsonb,
  show_notes text,
  chapters jsonb not null default '[]'::jsonb,
  keywords text[] not null default '{}',
  cta text,
  thumbnail_url text,
  video_url text,
  audio_url text,
  internal_notes text,
  -- Per-requirement completion checklist for the 20 Episode System, e.g.
  -- {"recording": true, "transcript": true, "show_notes": false, ...}
  completion jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    to_tsvector('english'::regconfig, coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index episodes_podcast_idx on public.episodes (podcast_id, episode_number);
create index episodes_status_idx on public.episodes (workspace_id, status);
create index episodes_publish_date_idx on public.episodes (publish_date);
create index episodes_search_idx on public.episodes using gin (search_vector);

create table public.episode_guests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (episode_id, guest_id)
);
create index episode_guests_guest_id_idx on public.episode_guests (guest_id);

create table public.interview_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  status public.approval_status not null default 'pending',
  generated_by text,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interview_briefs_episode_idx on public.interview_briefs (episode_id);

-- ---------------------------------------------------------------------------
-- Transcripts + Podcast Brain
-- ---------------------------------------------------------------------------
create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  language text not null default 'en',
  source text,
  status public.transcript_status not null default 'pending',
  full_text text,
  word_count int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transcripts_episode_idx on public.transcripts (episode_id);
create index transcripts_status_idx on public.transcripts (workspace_id, status);

create table public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transcript_id uuid not null references public.transcripts(id) on delete cascade,
  idx int not null,
  speaker text,
  start_ms int,
  end_ms int,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transcript_id, idx)
);
create index transcript_segments_transcript_idx on public.transcript_segments (transcript_id, idx);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  episode_id uuid references public.episodes(id) on delete cascade,
  transcript_id uuid references public.transcripts(id) on delete cascade,
  idx int not null default 0,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  content_tsv tsvector generated always as (to_tsvector('english'::regconfig, content)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index knowledge_chunks_source_idx on public.knowledge_chunks (source_type, source_id, idx);
create index knowledge_chunks_episode_idx on public.knowledge_chunks (episode_id);
create index knowledge_chunks_tsv_idx on public.knowledge_chunks using gin (content_tsv);

-- Optional embedding column: only when pgvector is installed. The app must
-- degrade to lexical search when this column is absent.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    execute 'alter table public.knowledge_chunks add column embedding vector(1536)';
    execute 'create index knowledge_chunks_embedding_idx on public.knowledge_chunks '
         || 'using hnsw (embedding vector_cosine_ops)';
  else
    raise notice 'pgvector absent: knowledge_chunks.embedding not created.';
  end if;
end
$$;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  transcript_id uuid references public.transcripts(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  text text not null,
  start_ms int,
  context text,
  tags text[] not null default '{}',
  search_vector tsvector generated always as (to_tsvector('english'::regconfig, text)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_episode_idx on public.quotes (episode_id);
create index quotes_contact_idx on public.quotes (contact_id);
create index quotes_search_idx on public.quotes using gin (search_vector);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table public.episode_topics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (episode_id, topic_id)
);
create index episode_topics_topic_idx on public.episode_topics (topic_id);

create table public.content_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  transcript_id uuid references public.transcripts(id) on delete set null,
  type public.content_asset_type not null,
  title text,
  body text,
  url text,
  metadata jsonb not null default '{}'::jsonb,
  generated_by text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_assets_episode_idx on public.content_assets (episode_id);
create index content_assets_type_idx on public.content_assets (workspace_id, type);
create index content_assets_status_idx on public.content_assets (workspace_id, status);

-- ---------------------------------------------------------------------------
-- Opportunity Engine, tasks, approvals
-- ---------------------------------------------------------------------------
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type public.opportunity_type not null default 'other',
  status public.opportunity_status not null default 'detected',
  title text not null,
  summary text,
  contact_id uuid references public.contacts(id) on delete set null,
  episode_id uuid references public.episodes(id) on delete set null,
  transcript_id uuid references public.transcripts(id) on delete set null,
  evidence_excerpt text,
  evidence_start_ms int,
  confidence numeric(3,2) check (confidence between 0 and 1),
  potential_value numeric(14,2),
  priority public.task_priority not null default 'medium',
  next_action text,
  due_date date,
  owner_id uuid references auth.users(id) on delete set null,
  detected_by text check (detected_by in ('ai', 'user')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index opportunities_status_idx on public.opportunities (workspace_id, status);
create index opportunities_contact_idx on public.opportunities (contact_id);
create index opportunities_episode_idx on public.opportunities (episode_id);
create index opportunities_owner_idx on public.opportunities (owner_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  source text,
  contact_id uuid references public.contacts(id) on delete set null,
  guest_id uuid references public.guests(id) on delete set null,
  episode_id uuid references public.episodes(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_status_idx on public.tasks (workspace_id, status);
create index tasks_due_idx on public.tasks (workspace_id, due_date);
create index tasks_assignee_idx on public.tasks (assignee_id);
create index tasks_contact_idx on public.tasks (contact_id);
create index tasks_guest_idx on public.tasks (guest_id);
create index tasks_episode_idx on public.tasks (episode_id);
create index tasks_opportunity_idx on public.tasks (opportunity_id);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  kind text not null,
  status public.approval_status not null default 'pending',
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index approvals_status_idx on public.approvals (workspace_id, status);
create index approvals_entity_idx on public.approvals (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Providers + publishing
-- ---------------------------------------------------------------------------
create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  capability public.provider_capability not null,
  provider text not null,
  status public.provider_status not null default 'disconnected',
  display_name text,
  config jsonb not null default '{}'::jsonb,
  -- Ciphertext only. Encrypted server-side; never returned to the browser.
  encrypted_credentials text,
  last_checked_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, capability, provider)
);
create index provider_connections_status_idx on public.provider_connections (workspace_id, status);

create table public.publishing_destinations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  kind text not null check (kind in ('rss_host', 'youtube', 'spotify', 'apple', 'social', 'other')),
  provider text not null,
  provider_connection_id uuid references public.provider_connections(id) on delete set null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index publishing_destinations_podcast_idx on public.publishing_destinations (podcast_id);

create table public.publishing_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  destination_id uuid not null references public.publishing_destinations(id) on delete cascade,
  status public.publishing_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  external_id text,
  external_url text,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index publishing_jobs_episode_idx on public.publishing_jobs (episode_id);
create index publishing_jobs_status_idx on public.publishing_jobs (workspace_id, status);
create index publishing_jobs_scheduled_idx on public.publishing_jobs (status, scheduled_for);

-- ---------------------------------------------------------------------------
-- Guest mode, consent, revenue
-- ---------------------------------------------------------------------------
create table public.target_podcasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  host_name text,
  url text,
  category text,
  audience text,
  fit_score int check (fit_score between 0 and 100),
  research jsonb not null default '{}'::jsonb,
  contact_id uuid references public.contacts(id) on delete set null,
  status text not null default 'identified' check (status in (
    'identified', 'researched', 'pitched', 'replied', 'booked', 'recorded', 'published', 'declined'
  )),
  booking_date timestamptz,
  published_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index target_podcasts_status_idx on public.target_podcasts (workspace_id, status);

create table public.guest_releases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete set null,
  version text not null default 'v1',
  recording_consent boolean not null default false,
  publishing_rights boolean not null default false,
  editing_permission boolean not null default false,
  promotional_reuse boolean not null default false,
  ai_processing boolean not null default false,
  accepted_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index guest_releases_guest_idx on public.guest_releases (guest_id);

create table public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  episode_id uuid references public.episodes(id) on delete set null,
  amount numeric(14,2) not null,
  kind text not null default 'direct' check (kind in ('direct', 'influenced')),
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index revenue_events_contact_idx on public.revenue_events (contact_id);
create index revenue_events_opportunity_idx on public.revenue_events (opportunity_id);
create index revenue_events_occurred_idx on public.revenue_events (workspace_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Tenant consistency: a row's workspace must belong to the row's organization.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_workspace_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.workspaces w
    where w.id = new.workspace_id and w.organization_id = new.organization_id
  ) then
    raise exception 'workspace % does not belong to organization %',
      new.workspace_id, new.organization_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Uniform per-table plumbing: workspace index, updated_at trigger, tenant
-- trigger, RLS (member select / member insert+update / admin+ delete).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tenant_tables text[] := array[
    'podcasts', 'podcast_strategies', 'brand_kits', 'founder_profiles',
    'contacts', 'relationships', 'interactions',
    'guests', 'guest_research', 'outreach_messages',
    'episodes', 'episode_guests', 'interview_briefs',
    'transcripts', 'transcript_segments', 'knowledge_chunks', 'quotes',
    'topics', 'episode_topics', 'content_assets',
    'opportunities', 'tasks', 'approvals',
    'provider_connections', 'publishing_destinations', 'publishing_jobs',
    'target_podcasts', 'guest_releases', 'revenue_events'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('create index if not exists %I on public.%I (workspace_id)', t || '_workspace_id_idx', t);
    execute format('create index if not exists %I on public.%I (organization_id)', t || '_organization_id_idx', t);

    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);

    execute format(
      'create trigger enforce_workspace_org before insert or update of organization_id, workspace_id on public.%I
         for each row execute function public.enforce_workspace_org()', t);

    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.is_org_member(organization_id))',
      t || '_select_member', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (public.has_org_role(organization_id, ''member''))',
      t || '_insert_member', t);

    execute format(
      'create policy %I on public.%I for update to authenticated
         using (public.has_org_role(organization_id, ''member''))
         with check (public.has_org_role(organization_id, ''member''))',
      t || '_update_member', t);

    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (public.has_org_role(organization_id, ''admin''))',
      t || '_delete_admin', t);
  end loop;
end
$$;

-- Grants for tables created in this migration (default privileges from 0001
-- cover them too, but be explicit).
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
