-- rls_tests.sql
-- Tenant isolation checks. Run as a superuser against a freshly reset local db
-- (scripts/db-local.sh test). Uses `set role authenticated` plus the
-- request.jwt.claim.sub setting to impersonate users, exactly as PostgREST does.
--
-- Fixtures from seed.sql:
--   user 1  00000000-0000-0000-0000-000000000001  demo@podcasting.gg  (owner of org 1)
--   org 1   10000000-0000-4000-8000-000000000001  Acme Advisory
-- Created here:
--   user 2  00000000-0000-0000-0000-000000000002  intruder@example.com (owner of org 2)
--   org 2   10000000-0000-4000-8000-000000000002  Other Co

\set ON_ERROR_STOP on
\set QUIET on

-- ---------------------------------------------------------------------------
-- Fixtures (as superuser)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated', 'intruder@example.com',
  crypt('intruder1234', gen_salt('bf')), now(),
  '{"full_name":"Ivy Intruder"}'::jsonb, now(), now(), '', '', '', ''
) on conflict (id) do nothing;

insert into public.organizations (id, name, slug, created_by)
values ('10000000-0000-4000-8000-000000000002', 'Other Co', 'other-co',
        '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.workspaces (id, organization_id, name, slug)
values ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
        'Other Co', 'other-co')
on conflict (id) do nothing;

insert into public.podcasts (id, organization_id, workspace_id, name, slug)
values ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000002', 'Other Co Show', 'other-co-show')
on conflict (id) do nothing;

insert into public.notifications (id, organization_id, user_id, kind, title)
values
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-0000-0000-000000000001', 'test', 'Notification for user 1'),
  ('90000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
   '00000000-0000-0000-0000-000000000002', 'test', 'Notification for user 2')
on conflict (id) do nothing;

-- Sanity: the creator-as-owner trigger fired for org 2.
do $$
begin
  if not exists (
    select 1 from public.organization_members
    where organization_id = '10000000-0000-4000-8000-000000000002'
      and user_id = '00000000-0000-0000-0000-000000000002'
      and role = 'owner'
  ) then
    raise exception 'FAIL: add_creator_as_owner did not add user 2 as owner of org 2';
  end if;
  if not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000002') then
    raise exception 'FAIL: handle_new_user did not create profile for user 2';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- As user 1 (demo, owner of org 1)
-- ---------------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

do $$
declare n int;
begin
  if auth.uid() <> '00000000-0000-0000-0000-000000000001' then
    raise exception 'FAIL: auth.uid() shim not returning user 1';
  end if;

  select count(*) into n from public.organizations;
  if n <> 1 then raise exception 'FAIL: user 1 should see exactly 1 org, saw %', n; end if;

  select count(*) into n from public.podcasts
   where organization_id = '10000000-0000-4000-8000-000000000001';
  if n < 1 then raise exception 'FAIL: user 1 cannot see own org podcasts'; end if;

  select count(*) into n from public.podcasts
   where organization_id = '10000000-0000-4000-8000-000000000002';
  if n <> 0 then raise exception 'FAIL: user 1 can see org 2 podcasts (%)', n; end if;

  select count(*) into n from public.episodes;
  if n < 5 then raise exception 'FAIL: user 1 should see seeded episodes, saw %', n; end if;

  select count(*) into n from public.contacts;
  if n < 6 then raise exception 'FAIL: user 1 should see seeded contacts, saw %', n; end if;

  -- notifications are private
  select count(*) into n from public.notifications;
  if n < 1 then raise exception 'FAIL: user 1 should see at least 1 notification, saw %', n; end if;
  if exists (select 1 from public.notifications where user_id <> auth.uid()) then
    raise exception 'FAIL: user 1 can see another user''s notification';
  end if;

  -- own-org insert works (owner)
  insert into public.podcasts (organization_id, workspace_id, name, slug)
  values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
          'RLS Probe', 'rls-probe');

  -- cross-tenant insert blocked
  begin
    insert into public.podcasts (organization_id, workspace_id, name, slug)
    values ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002',
            'Should Fail', 'should-fail');
    raise exception 'FAIL: user 1 inserted a podcast into org 2';
  exception
    when insufficient_privilege then null; -- expected: RLS with-check violation
  end;

  -- mixing org 1 with a workspace from org 2 is blocked by the tenant trigger
  -- (or RLS, depending on which fires first; either way it must not succeed)
  begin
    insert into public.podcasts (organization_id, workspace_id, name, slug)
    values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
            'Cross Workspace', 'cross-workspace');
    raise exception 'FAIL: inserted a row whose workspace belongs to another org';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  -- cross-tenant update is a silent no-op under RLS
  update public.podcasts set name = 'Hacked'
   where id = '30000000-0000-4000-8000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user 1 updated org 2 podcast'; end if;
end
$$;

reset role;
reset request.jwt.claim.sub;

-- ---------------------------------------------------------------------------
-- As user 2 (owner of org 2, no relation to org 1)
-- ---------------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

do $$
declare n int;
begin
  select count(*) into n from public.organizations
   where id = '10000000-0000-4000-8000-000000000001';
  if n <> 0 then raise exception 'FAIL: user 2 can see org 1'; end if;

  select count(*) into n from public.podcasts
   where organization_id = '10000000-0000-4000-8000-000000000001';
  if n <> 0 then raise exception 'FAIL: user 2 can see org 1 podcasts (%)', n; end if;

  select count(*) into n from public.podcasts;
  if n <> 1 then raise exception 'FAIL: user 2 should see exactly 1 podcast (own), saw %', n; end if;

  -- every tenant table must be empty for user 2 except the one seeded org-2 podcast
  select count(*) into n from public.contacts;      if n <> 0 then raise exception 'FAIL: user 2 sees contacts'; end if;
  select count(*) into n from public.episodes;      if n <> 0 then raise exception 'FAIL: user 2 sees episodes'; end if;
  select count(*) into n from public.transcripts;   if n <> 0 then raise exception 'FAIL: user 2 sees transcripts'; end if;
  select count(*) into n from public.opportunities; if n <> 0 then raise exception 'FAIL: user 2 sees opportunities'; end if;
  select count(*) into n from public.tasks;         if n <> 0 then raise exception 'FAIL: user 2 sees tasks'; end if;
  select count(*) into n from public.provider_connections; if n <> 0 then raise exception 'FAIL: user 2 sees provider connections'; end if;
  select count(*) into n from public.workspaces where organization_id = '10000000-0000-4000-8000-000000000001';
  if n <> 0 then raise exception 'FAIL: user 2 sees org 1 workspaces'; end if;
  select count(*) into n from public.organization_members where organization_id = '10000000-0000-4000-8000-000000000001';
  if n <> 0 then raise exception 'FAIL: user 2 sees org 1 members'; end if;
  select count(*) into n from public.background_jobs; if n <> 0 then raise exception 'FAIL: user 2 sees org 1 jobs'; end if;
  select count(*) into n from public.audit_logs;      if n <> 0 then raise exception 'FAIL: user 2 sees org 1 audit logs'; end if;

  -- profiles: can see self, cannot see user 1 (no shared org)
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'FAIL: user 2 cannot see own profile';
  end if;
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL: user 2 can see user 1 profile without a shared org';
  end if;

  -- notifications private
  select count(*) into n from public.notifications;
  if n <> 1 then raise exception 'FAIL: user 2 should see exactly 1 notification, saw %', n; end if;
  if exists (select 1 from public.notifications where user_id <> auth.uid()) then
    raise exception 'FAIL: user 2 can see user 1 notification';
  end if;

  -- cannot insert into org 1 (several tables)
  begin
    insert into public.podcasts (organization_id, workspace_id, name, slug)
    values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
            'Intrusion', 'intrusion');
    raise exception 'FAIL: user 2 inserted a podcast into org 1';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.contacts (organization_id, workspace_id, full_name)
    values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Mallory');
    raise exception 'FAIL: user 2 inserted a contact into org 1';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.workspaces (organization_id, name, slug)
    values ('10000000-0000-4000-8000-000000000001', 'Rogue', 'rogue');
    raise exception 'FAIL: user 2 inserted a workspace into org 1';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.organization_members (organization_id, user_id, role)
    values ('10000000-0000-4000-8000-000000000001', auth.uid(), 'owner');
    raise exception 'FAIL: user 2 added themselves to org 1';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.notifications (organization_id, user_id, kind, title)
    values ('10000000-0000-4000-8000-000000000002', auth.uid(), 'test', 'self insert');
    raise exception 'FAIL: authenticated user could insert a notification directly';
  exception when insufficient_privilege then null;
  end;

  -- cross-tenant update / delete are no-ops
  update public.podcasts set name = 'Hacked'
   where organization_id = '10000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user 2 updated org 1 podcasts'; end if;

  delete from public.episodes where organization_id = '10000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user 2 deleted org 1 episodes'; end if;

  -- own org works
  insert into public.contacts (organization_id, workspace_id, full_name)
  values ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Own Contact');
end
$$;

reset role;
reset request.jwt.claim.sub;

-- ---------------------------------------------------------------------------
-- Role ladder: a viewer in org 1 can read but not write, and cannot delete.
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000003',
  'authenticated', 'authenticated', 'viewer@example.com',
  crypt('viewer1234', gen_salt('bf')), now(),
  '{"full_name":"Vic Viewer"}'::jsonb, now(), now(), '', '', '', ''
) on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role)
values ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000003', 'viewer')
on conflict do nothing;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';

do $$
declare n int;
begin
  select count(*) into n from public.podcasts
   where organization_id = '10000000-0000-4000-8000-000000000001';
  if n < 1 then raise exception 'FAIL: viewer cannot read org 1 podcasts'; end if;

  begin
    insert into public.contacts (organization_id, workspace_id, full_name)
    values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Viewer Insert');
    raise exception 'FAIL: viewer inserted a contact';
  exception when insufficient_privilege then null;
  end;

  delete from public.podcasts where slug = 'rls-probe';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: viewer deleted a podcast'; end if;

  -- viewer shares an org with user 1, so may read their profile
  if not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL: viewer cannot see profile of org-mate';
  end if;
end
$$;

reset role;
reset request.jwt.claim.sub;

-- Owner can delete (admin+ policy)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  delete from public.podcasts where slug = 'rls-probe';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner could not delete own podcast (row_count %)', n; end if;
end
$$;
reset role;
reset request.jwt.claim.sub;

\echo RLS tests passed
