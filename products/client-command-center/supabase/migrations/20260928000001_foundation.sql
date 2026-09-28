-- Foundation: organizations, memberships, clients, append-only audit trail.
-- Forward-only. Never edit this file after it has been applied anywhere; add a new migration.

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.member_role as enum ('owner', 'admin', 'csm', 'viewer');

-- The account's commercial/operational placement. "Paused" is represented as
-- `inactive` plus a structured reason, not as a separate stage.
create type public.account_stage as enum (
  'payment_pending',
  'paid',
  'contract_signed',
  'onboarding_booked',
  'active',
  'inactive',
  'finished'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations (id),
  user_id uuid not null references auth.users (id),
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  display_name text not null check (length(trim(display_name)) > 0),
  business_name text,
  primary_email text,
  timezone text,
  account_stage public.account_stage not null default 'payment_pending',
  inactive_reason text,
  -- Internal/fixture accounts are clearly labelled so they are never mistaken for real clients.
  is_internal_test boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_inactive_reason_required
    check (account_stage <> 'inactive' or length(trim(coalesce(inactive_reason, ''))) > 0)
);

create index clients_org_idx on public.clients (org_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_org_entity_idx on public.audit_events (org_id, entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Private helpers (not exposed through the Data API)
-- ---------------------------------------------------------------------------

create function private.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid()
  )
$$;

create function private.has_role(p_org uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role = any (p_roles)
  )
$$;

-- Raises unless the caller holds one of the roles in the organization.
create function private.require_role(p_org uuid, p_roles public.member_role[]) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not private.has_role(p_org, p_roles) then
    raise exception 'not authorized: requires one of %', p_roles using errcode = '42501';
  end if;
end
$$;

create function private.write_audit(
  p_org uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_reason text,
  p_detail jsonb
) returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_events (org_id, actor_id, action, entity_type, entity_id, reason, detail)
  values (p_org, auth.uid(), p_action, p_entity_type, p_entity_id, p_reason, coalesce(p_detail, '{}'::jsonb))
$$;

-- Used by triggers on append-only tables.
create function private.reject_mutation() returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op using errcode = '42501';
end
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_member(uuid) to authenticated, service_role;
grant execute on function private.has_role(uuid, public.member_role[]) to authenticated, service_role;

create trigger audit_events_append_only
  before update or delete on public.audit_events
  for each row execute function private.reject_mutation();

-- ---------------------------------------------------------------------------
-- Row-level security. Reads are scoped to members; writes go through the
-- security-definer functions below, never directly through table grants.
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.clients enable row level security;
alter table public.audit_events enable row level security;

revoke all on public.organizations, public.memberships, public.clients, public.audit_events from anon;
revoke insert, update, delete, truncate on public.organizations, public.memberships, public.clients, public.audit_events from authenticated;
grant select on public.organizations, public.memberships, public.clients to authenticated;
grant select on public.audit_events to authenticated;

create policy organizations_member_read on public.organizations
  for select to authenticated using (private.is_member(id));

create policy memberships_member_read on public.memberships
  for select to authenticated using (private.is_member(org_id));

create policy clients_member_read on public.clients
  for select to authenticated using (private.is_member(org_id));

-- Audit history is visible to owners/admins; CSMs and viewers see it through entity views later.
create policy audit_events_admin_read on public.audit_events
  for select to authenticated using (private.has_role(org_id, array['owner', 'admin']::public.member_role[]));

-- ---------------------------------------------------------------------------
-- Client commands
-- ---------------------------------------------------------------------------

create function public.create_client(
  p_org_id uuid,
  p_display_name text,
  p_business_name text default null,
  p_primary_email text default null,
  p_timezone text default null,
  p_is_internal_test boolean default false
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_role(p_org_id, array['owner', 'admin', 'csm']::public.member_role[]);

  insert into public.clients (org_id, display_name, business_name, primary_email, timezone, is_internal_test, created_by)
  values (p_org_id, trim(p_display_name), nullif(trim(p_business_name), ''), nullif(lower(trim(p_primary_email)), ''),
          nullif(trim(p_timezone), ''), coalesce(p_is_internal_test, false), auth.uid())
  returning id into v_id;

  perform private.write_audit(p_org_id, 'client.created', 'client', v_id, null,
    jsonb_build_object('display_name', p_display_name, 'is_internal_test', coalesce(p_is_internal_test, false)));
  return v_id;
end
$$;

-- Stage changes past payment are commercial decisions: owner/admin only, reason required.
create function public.set_account_stage(
  p_client_id uuid,
  p_stage public.account_stage,
  p_reason text,
  p_inactive_reason text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_client public.clients%rowtype;
begin
  select * into v_client from public.clients where id = p_client_id for update;
  if not found then
    raise exception 'client not found' using errcode = 'P0002';
  end if;
  perform private.require_role(v_client.org_id, array['owner', 'admin']::public.member_role[]);

  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'a reason is required for stage changes' using errcode = '22023';
  end if;
  if v_client.account_stage = p_stage then
    return;
  end if;

  update public.clients
     set account_stage = p_stage,
         inactive_reason = case when p_stage = 'inactive' then p_inactive_reason else null end,
         updated_at = now()
   where id = p_client_id;

  perform private.write_audit(v_client.org_id, 'client.stage_changed', 'client', p_client_id, p_reason,
    jsonb_build_object('from', v_client.account_stage, 'to', p_stage, 'inactive_reason', p_inactive_reason));
end
$$;

revoke all on function public.create_client(uuid, text, text, text, text, boolean) from public, anon;
revoke all on function public.set_account_stage(uuid, public.account_stage, text, text) from public, anon;
grant execute on function public.create_client(uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.set_account_stage(uuid, public.account_stage, text, text) to authenticated;
