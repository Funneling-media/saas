-- 0001_foundation.sql
-- Tenant foundation for Podcasting.gg: profiles, organizations, members,
-- workspaces, audit logs, background jobs, notifications, RLS helpers.
--
-- Tenant model: auth.users -> profiles -> organization_members -> organizations
--               -> workspaces -> (product tables, see 0002_core_domain.sql)

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- pgvector is optional. Local Postgres installs often lack it; production
-- Supabase has it. Nothing in the schema hard-depends on it (see 0002).
do $$
begin
  create extension if not exists vector;
exception
  when others then
    raise notice 'pgvector not available (%). Continuing without embeddings.', sqlerrm;
end
$$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.org_role as enum ('owner', 'admin', 'member', 'viewer');

create type public.job_status as enum (
  'queued', 'running', 'waiting', 'completed', 'failed', 'retrying', 'cancelled'
);

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  ghl_contact_id text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  ghl_contact_id text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);

create trigger set_updated_at before update on public.organization_members
  for each row execute function public.set_updated_at();

-- The creator of an organization automatically becomes its owner. This avoids
-- a chicken-and-egg RLS problem where a brand new org has no members yet.
create or replace function public.add_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.organization_members (organization_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (organization_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger add_creator_as_owner
  after insert on public.organizations
  for each row execute function public.add_creator_as_owner();

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, slug)
);

create index workspaces_organization_id_idx on public.workspaces (organization_id);

create trigger set_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- background_jobs
-- ---------------------------------------------------------------------------
create table public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  kind text not null,
  status public.job_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  attempts int not null default 0,
  max_attempts int not null default 3,
  idempotency_key text unique,
  related_entity_type text,
  related_entity_id uuid,
  provider text,
  run_after timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index background_jobs_status_run_after_idx on public.background_jobs (status, run_after);
create index background_jobs_org_idx on public.background_jobs (organization_id, created_at desc);
create index background_jobs_related_idx on public.background_jobs (related_entity_type, related_entity_id);

create trigger set_updated_at before update on public.background_jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER so they bypass RLS on
-- organization_members and never recurse into policies).
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.org_role(org uuid)
returns public.org_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = org
    and m.user_id = auth.uid()
  limit 1;
$$;

-- owner > admin > member > viewer
create or replace function public.org_role_rank(r public.org_role)
returns int
language sql
immutable
as $$
  select case r
    when 'owner' then 4
    when 'admin' then 3
    when 'member' then 2
    when 'viewer' then 1
    else 0
  end;
$$;

create or replace function public.has_org_role(org uuid, min public.org_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.org_role_rank(public.org_role(org)) >= public.org_role_rank(min),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspaces enable row level security;
alter table public.audit_logs enable row level security;
alter table public.background_jobs enable row level security;
alter table public.notifications enable row level security;

-- profiles: self read/update; members of a shared org can read.
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select_shared_org on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.organization_members mine
      join public.organization_members theirs
        on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid()
        and theirs.user_id = public.profiles.id
    )
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- organizations
create policy organizations_select_member on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy organizations_insert_creator on public.organizations
  for insert to authenticated
  with check (created_by = auth.uid());

create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (public.has_org_role(id, 'admin'))
  with check (public.has_org_role(id, 'admin'));

create policy organizations_delete_owner on public.organizations
  for delete to authenticated
  using (public.has_org_role(id, 'owner'));

-- organization_members
create policy organization_members_select_member on public.organization_members
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy organization_members_insert_admin on public.organization_members
  for insert to authenticated
  with check (public.has_org_role(organization_id, 'admin'));

create policy organization_members_update_admin on public.organization_members
  for update to authenticated
  using (public.has_org_role(organization_id, 'admin'))
  with check (public.has_org_role(organization_id, 'admin'));

create policy organization_members_delete_admin on public.organization_members
  for delete to authenticated
  using (public.has_org_role(organization_id, 'admin'));

-- workspaces
create policy workspaces_select_member on public.workspaces
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy workspaces_insert_admin on public.workspaces
  for insert to authenticated
  with check (public.has_org_role(organization_id, 'admin'));

create policy workspaces_update_admin on public.workspaces
  for update to authenticated
  using (public.has_org_role(organization_id, 'admin'))
  with check (public.has_org_role(organization_id, 'admin'));

create policy workspaces_delete_admin on public.workspaces
  for delete to authenticated
  using (public.has_org_role(organization_id, 'admin'));

-- audit_logs: append-only for members.
create policy audit_logs_select_member on public.audit_logs
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy audit_logs_insert_member on public.audit_logs
  for insert to authenticated
  with check (public.is_org_member(organization_id));

-- background_jobs
create policy background_jobs_select_member on public.background_jobs
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy background_jobs_insert_admin on public.background_jobs
  for insert to authenticated
  with check (public.has_org_role(organization_id, 'admin'));

create policy background_jobs_update_admin on public.background_jobs
  for update to authenticated
  using (public.has_org_role(organization_id, 'admin'))
  with check (public.has_org_role(organization_id, 'admin'));

create policy background_jobs_delete_admin on public.background_jobs
  for delete to authenticated
  using (public.has_org_role(organization_id, 'admin'));

-- notifications: strictly private to the recipient.
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (Supabase convention). RLS still governs `authenticated`;
-- `service_role` bypasses RLS.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to authenticated, service_role;
