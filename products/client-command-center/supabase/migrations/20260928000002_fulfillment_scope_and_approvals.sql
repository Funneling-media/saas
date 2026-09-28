-- Fulfillment core: immutable scope snapshots, deliverable versions, source/QA evidence,
-- classified feedback with revision counting, and exact-version approval evidence that
-- unlocks dependent packages. Forward-only.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.revision_policy_status as enum ('contracted', 'unknown_review_required');

create type public.package_status as enum (
  'locked',
  'queued',
  'in_production',
  'internal_qa',
  'client_review',
  'revision_requested',
  'approved'
);

create type public.evidence_kind as enum ('source', 'qa');
create type public.source_provenance as enum ('raw', 'summarized', 'self_reported', 'independently_verified');
create type public.qa_result as enum ('pass', 'fail', 'waived');

create type public.feedback_classification as enum (
  'factual_correction',
  'brand_preference',
  'strategic_suggestion',
  'compliance_issue',
  'scope_change',
  'unsupported_claim',
  'contradictory_request'
);

create type public.feedback_scope_status as enum (
  'not_a_revision',
  'within_allowance',
  'exceeds_allowance',
  'allowance_unknown',
  'scope_change_owner_review'
);

-- ---------------------------------------------------------------------------
-- Scope templates (global, read-only to members; changed only by new migrations)
-- ---------------------------------------------------------------------------

create table public.scope_templates (
  code text not null,
  version integer not null check (version > 0),
  name text not null,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  primary key (code, version),
  constraint scope_templates_has_packages
    check (jsonb_typeof(definition -> 'packages') = 'array' and jsonb_array_length(definition -> 'packages') > 0)
);

create trigger scope_templates_append_only
  before update or delete on public.scope_templates
  for each row execute function private.reject_mutation();

-- ---------------------------------------------------------------------------
-- Per-client scope snapshot. One per client. Immutable once written: later
-- template edits never change an existing client's scope.
-- ---------------------------------------------------------------------------

create table public.fulfillment_scopes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  client_id uuid not null unique references public.clients (id),
  template_code text not null,
  template_version integer not null,
  snapshot jsonb not null,
  -- Revision allowance as written in the signed agreement. NULL means the contract is
  -- silent/unavailable and the policy is unknown; nothing assumes a default.
  included_revision_rounds integer check (included_revision_rounds is null or included_revision_rounds >= 0),
  revision_policy_status public.revision_policy_status not null,
  contract_reference text not null check (length(trim(contract_reference)) > 0),
  activation_reason text not null check (length(trim(activation_reason)) > 0),
  idempotency_key text not null,
  activated_by uuid not null references auth.users (id),
  activated_at timestamptz not null default now(),
  foreign key (template_code, template_version) references public.scope_templates (code, version),
  unique (org_id, idempotency_key),
  constraint fulfillment_scopes_policy_consistent check (
    (revision_policy_status = 'contracted' and included_revision_rounds is not null)
    or (revision_policy_status = 'unknown_review_required' and included_revision_rounds is null)
  )
);

create trigger fulfillment_scopes_append_only
  before update or delete on public.fulfillment_scopes
  for each row execute function private.reject_mutation();

-- Owner-recorded changes to the revision policy (e.g. the contract is located later).
-- Append-only; the latest amendment wins.
create table public.scope_amendments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  scope_id uuid not null references public.fulfillment_scopes (id),
  included_revision_rounds integer check (included_revision_rounds is null or included_revision_rounds >= 0),
  revision_policy_status public.revision_policy_status not null,
  contract_reference text not null check (length(trim(contract_reference)) > 0),
  reason text not null check (length(trim(reason)) > 0),
  amended_by uuid not null references auth.users (id),
  amended_at timestamptz not null default now(),
  constraint scope_amendments_policy_consistent check (
    (revision_policy_status = 'contracted' and included_revision_rounds is not null)
    or (revision_policy_status = 'unknown_review_required' and included_revision_rounds is null)
  )
);

create index scope_amendments_scope_idx on public.scope_amendments (scope_id, amended_at desc);

create trigger scope_amendments_append_only
  before update or delete on public.scope_amendments
  for each row execute function private.reject_mutation();

-- ---------------------------------------------------------------------------
-- Packages (mutable status; changed only by the functions below)
-- ---------------------------------------------------------------------------

create table public.deliverable_packages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  client_id uuid not null references public.clients (id),
  scope_id uuid not null references public.fulfillment_scopes (id),
  package_key text not null,
  title text not null,
  position integer not null,
  depends_on text[] not null default '{}',
  status public.package_status not null,
  current_version_id uuid,
  approved_version_id uuid,
  updated_at timestamptz not null default now(),
  unique (scope_id, package_key),
  unique (scope_id, position)
);

create index deliverable_packages_client_idx on public.deliverable_packages (client_id, position);

-- ---------------------------------------------------------------------------
-- Versions, evidence, feedback, approvals (all append-only)
-- ---------------------------------------------------------------------------

create table public.deliverable_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  package_id uuid not null references public.deliverable_packages (id),
  version_number integer not null check (version_number > 0),
  artifact_url text not null check (length(trim(artifact_url)) > 0),
  -- A version must be identifiable independent of its URL: a content hash, a provider
  -- asset ID, or both. This stops a replaced file from inheriting an old approval.
  content_sha256 text check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  provider text,
  provider_asset_id text,
  notes text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (package_id, version_number),
  constraint deliverable_versions_identity
    check (content_sha256 is not null or length(trim(coalesce(provider_asset_id, ''))) > 0)
);

alter table public.deliverable_packages
  add constraint deliverable_packages_current_version_fk
    foreign key (current_version_id) references public.deliverable_versions (id),
  add constraint deliverable_packages_approved_version_fk
    foreign key (approved_version_id) references public.deliverable_versions (id);

create trigger deliverable_versions_append_only
  before update or delete on public.deliverable_versions
  for each row execute function private.reject_mutation();

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  version_id uuid not null references public.deliverable_versions (id),
  kind public.evidence_kind not null,
  -- source evidence
  source_provider text,
  source_id text,
  url text,
  source_date date,
  provenance public.source_provenance,
  -- QA evidence
  qa_checklist_version text,
  qa_result public.qa_result,
  findings text,
  recorded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint evidence_items_source_shape check (
    kind <> 'source'
    or (provenance is not null and (length(trim(coalesce(url, ''))) > 0 or length(trim(coalesce(source_id, ''))) > 0))
  ),
  constraint evidence_items_qa_shape check (
    kind <> 'qa'
    or (qa_result is not null and length(trim(coalesce(qa_checklist_version, ''))) > 0
        and (qa_result <> 'waived' or length(trim(coalesce(findings, ''))) > 0))
  )
);

create index evidence_items_version_idx on public.evidence_items (version_id, kind, created_at);

create trigger evidence_items_append_only
  before update or delete on public.evidence_items
  for each row execute function private.reject_mutation();

create table public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  package_id uuid not null references public.deliverable_packages (id),
  version_id uuid not null references public.deliverable_versions (id),
  source_url text not null check (length(trim(source_url)) > 0),
  author_label text not null check (length(trim(author_label)) > 0),
  received_at timestamptz not null,
  classification public.feedback_classification not null,
  requested_changes text not null check (length(trim(requested_changes)) > 0),
  counts_as_revision boolean not null,
  revision_round integer,
  scope_status public.feedback_scope_status not null,
  recorded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index feedback_items_package_idx on public.feedback_items (package_id, created_at);

create trigger feedback_items_append_only
  before update or delete on public.feedback_items
  for each row execute function private.reject_mutation();

create table public.approval_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  package_id uuid not null references public.deliverable_packages (id),
  version_id uuid not null references public.deliverable_versions (id),
  -- Identity of the exact asset approved, copied from the version at approval time.
  version_number integer not null,
  content_sha256 text,
  provider_asset_id text,
  -- This slice records client approvals captured by the team (Loom, email, form). A
  -- dedicated client-reviewer identity is a later slice.
  actor_kind text not null default 'internal_on_behalf_of_client'
    check (actor_kind in ('internal_on_behalf_of_client')),
  approver_label text not null check (length(trim(approver_label)) > 0),
  evidence_url text not null check (length(trim(evidence_url)) > 0),
  idempotency_key text not null check (length(trim(idempotency_key)) > 0),
  recorded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (org_id, idempotency_key)
);

create index approval_events_package_idx on public.approval_events (package_id, created_at);

create trigger approval_events_append_only
  before update or delete on public.approval_events
  for each row execute function private.reject_mutation();

-- ---------------------------------------------------------------------------
-- RLS: members read their organization's rows; no direct writes.
-- ---------------------------------------------------------------------------

alter table public.scope_templates enable row level security;
alter table public.fulfillment_scopes enable row level security;
alter table public.scope_amendments enable row level security;
alter table public.deliverable_packages enable row level security;
alter table public.deliverable_versions enable row level security;
alter table public.evidence_items enable row level security;
alter table public.feedback_items enable row level security;
alter table public.approval_events enable row level security;

revoke all on public.scope_templates, public.fulfillment_scopes, public.scope_amendments,
  public.deliverable_packages, public.deliverable_versions, public.evidence_items,
  public.feedback_items, public.approval_events from anon;
revoke insert, update, delete, truncate on public.scope_templates, public.fulfillment_scopes,
  public.scope_amendments, public.deliverable_packages, public.deliverable_versions,
  public.evidence_items, public.feedback_items, public.approval_events from authenticated;
grant select on public.scope_templates, public.fulfillment_scopes, public.scope_amendments,
  public.deliverable_packages, public.deliverable_versions, public.evidence_items,
  public.feedback_items, public.approval_events to authenticated;

create policy scope_templates_read on public.scope_templates
  for select to authenticated using (true);
create policy fulfillment_scopes_member_read on public.fulfillment_scopes
  for select to authenticated using (private.is_member(org_id));
create policy scope_amendments_member_read on public.scope_amendments
  for select to authenticated using (private.is_member(org_id));
create policy deliverable_packages_member_read on public.deliverable_packages
  for select to authenticated using (private.is_member(org_id));
create policy deliverable_versions_member_read on public.deliverable_versions
  for select to authenticated using (private.is_member(org_id));
create policy evidence_items_member_read on public.evidence_items
  for select to authenticated using (private.is_member(org_id));
create policy feedback_items_member_read on public.feedback_items
  for select to authenticated using (private.is_member(org_id));
create policy approval_events_member_read on public.approval_events
  for select to authenticated using (private.is_member(org_id));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Effective revision allowance: latest amendment, else the activation snapshot.
create function private.effective_revision_policy(p_scope_id uuid)
returns table (included_revision_rounds integer, revision_policy_status public.revision_policy_status)
language sql stable security definer set search_path = ''
as $$
  select a.included_revision_rounds, a.revision_policy_status
    from public.scope_amendments a
   where a.scope_id = p_scope_id
   order by a.amended_at desc, a.id desc
   limit 1
$$;

create function public.effective_revision_policy(p_scope_id uuid)
returns table (included_revision_rounds integer, revision_policy_status public.revision_policy_status)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_scope public.fulfillment_scopes%rowtype;
begin
  select * into v_scope from public.fulfillment_scopes where id = p_scope_id;
  if not found or not private.is_member(v_scope.org_id) then
    raise exception 'scope not found' using errcode = 'P0002';
  end if;
  return query select * from private.effective_revision_policy(p_scope_id);
  if not found then
    return query select v_scope.included_revision_rounds, v_scope.revision_policy_status;
  end if;
end
$$;

-- Loads a package for a write, enforcing the caller's role in the package's organization.
create function private.lock_package(p_package_id uuid, p_roles public.member_role[])
returns public.deliverable_packages
language plpgsql security definer set search_path = ''
as $$
declare
  v_pkg public.deliverable_packages%rowtype;
begin
  select * into v_pkg from public.deliverable_packages where id = p_package_id for update;
  if not found then
    raise exception 'package not found' using errcode = 'P0002';
  end if;
  perform private.require_role(v_pkg.org_id, p_roles);
  return v_pkg;
end
$$;

-- ---------------------------------------------------------------------------
-- Commands
-- ---------------------------------------------------------------------------

-- Activation is the entitlement decision: owner/admin only, requires a signed-contract
-- stage (payment alone never activates), and snapshots the template into the client's scope.
create function public.activate_fulfillment(
  p_client_id uuid,
  p_template_code text,
  p_template_version integer,
  p_contract_reference text,
  p_included_revision_rounds integer,
  p_reason text,
  p_idempotency_key text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_client public.clients%rowtype;
  v_template public.scope_templates%rowtype;
  v_scope_id uuid;
  v_existing public.fulfillment_scopes%rowtype;
  v_pkg jsonb;
begin
  select * into v_client from public.clients where id = p_client_id for update;
  if not found then
    raise exception 'client not found' using errcode = 'P0002';
  end if;
  perform private.require_role(v_client.org_id, array['owner', 'admin']::public.member_role[]);

  if length(trim(coalesce(p_idempotency_key, ''))) = 0 then
    raise exception 'idempotency key required' using errcode = '22023';
  end if;

  select * into v_existing from public.fulfillment_scopes
   where org_id = v_client.org_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.client_id <> p_client_id then
      raise exception 'idempotency key already used for a different client' using errcode = '23505';
    end if;
    return v_existing.id;
  end if;

  if exists (select 1 from public.fulfillment_scopes where client_id = p_client_id) then
    raise exception 'client already has an activated scope; amend it instead of re-activating' using errcode = '23505';
  end if;

  if v_client.account_stage not in ('contract_signed', 'onboarding_booked', 'active') then
    raise exception 'fulfillment requires a signed contract; client stage is %', v_client.account_stage
      using errcode = '22023';
  end if;

  select * into v_template from public.scope_templates
   where code = p_template_code and version = p_template_version;
  if not found then
    raise exception 'scope template %@% not found', p_template_code, p_template_version using errcode = 'P0002';
  end if;

  insert into public.fulfillment_scopes (
    org_id, client_id, template_code, template_version, snapshot,
    included_revision_rounds, revision_policy_status, contract_reference,
    activation_reason, idempotency_key, activated_by
  ) values (
    v_client.org_id, p_client_id, v_template.code, v_template.version, v_template.definition,
    p_included_revision_rounds,
    case when p_included_revision_rounds is null then 'unknown_review_required' else 'contracted' end::public.revision_policy_status,
    trim(p_contract_reference), trim(coalesce(p_reason, '')), p_idempotency_key, auth.uid()
  ) returning id into v_scope_id;

  for v_pkg in select value from jsonb_array_elements(v_template.definition -> 'packages') loop
    insert into public.deliverable_packages (org_id, client_id, scope_id, package_key, title, position, depends_on, status)
    values (
      v_client.org_id, p_client_id, v_scope_id,
      v_pkg ->> 'key', v_pkg ->> 'title', (v_pkg ->> 'position')::integer,
      coalesce(array(select jsonb_array_elements_text(v_pkg -> 'depends_on')), '{}'),
      case when jsonb_array_length(coalesce(v_pkg -> 'depends_on', '[]'::jsonb)) = 0
           then 'queued' else 'locked' end::public.package_status
    );
  end loop;

  perform private.write_audit(v_client.org_id, 'fulfillment.activated', 'fulfillment_scope', v_scope_id, p_reason,
    jsonb_build_object('client_id', p_client_id, 'template', v_template.code, 'template_version', v_template.version,
                       'included_revision_rounds', p_included_revision_rounds,
                       'contract_reference', p_contract_reference));
  return v_scope_id;
end
$$;

-- Owner-only: record the revision policy once the contract is located or clarified.
create function public.amend_revision_policy(
  p_scope_id uuid,
  p_included_revision_rounds integer,
  p_contract_reference text,
  p_reason text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_scope public.fulfillment_scopes%rowtype;
  v_id uuid;
begin
  select * into v_scope from public.fulfillment_scopes where id = p_scope_id;
  if not found then
    raise exception 'scope not found' using errcode = 'P0002';
  end if;
  perform private.require_role(v_scope.org_id, array['owner']::public.member_role[]);

  insert into public.scope_amendments (org_id, scope_id, included_revision_rounds, revision_policy_status,
                                       contract_reference, reason, amended_by)
  values (v_scope.org_id, p_scope_id, p_included_revision_rounds,
          case when p_included_revision_rounds is null then 'unknown_review_required' else 'contracted' end::public.revision_policy_status,
          trim(coalesce(p_contract_reference, '')), trim(coalesce(p_reason, '')), auth.uid())
  returning id into v_id;

  perform private.write_audit(v_scope.org_id, 'fulfillment.revision_policy_amended', 'fulfillment_scope', p_scope_id,
    p_reason, jsonb_build_object('included_revision_rounds', p_included_revision_rounds,
                                 'contract_reference', p_contract_reference));
  return v_id;
end
$$;

create function public.start_package(p_package_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_pkg public.deliverable_packages;
begin
  v_pkg := private.lock_package(p_package_id, array['owner', 'admin', 'csm']::public.member_role[]);
  if v_pkg.status <> 'queued' then
    raise exception 'only a queued package can start production (status is %)', v_pkg.status using errcode = '22023';
  end if;
  update public.deliverable_packages set status = 'in_production', updated_at = now() where id = p_package_id;
  perform private.write_audit(v_pkg.org_id, 'package.started', 'deliverable_package', p_package_id, null,
    jsonb_build_object('from', v_pkg.status));
end
$$;

-- Registers a new immutable version. Moves the package to internal QA.
create function public.submit_version(
  p_package_id uuid,
  p_artifact_url text,
  p_content_sha256 text,
  p_provider text,
  p_provider_asset_id text,
  p_notes text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_pkg public.deliverable_packages;
  v_next integer;
  v_id uuid;
begin
  v_pkg := private.lock_package(p_package_id, array['owner', 'admin', 'csm']::public.member_role[]);
  if v_pkg.status not in ('in_production', 'revision_requested') then
    raise exception 'cannot submit a version while package is %', v_pkg.status using errcode = '22023';
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next
    from public.deliverable_versions where package_id = p_package_id;

  insert into public.deliverable_versions (org_id, package_id, version_number, artifact_url, content_sha256,
                                           provider, provider_asset_id, notes, created_by)
  values (v_pkg.org_id, p_package_id, v_next, trim(p_artifact_url), nullif(lower(trim(p_content_sha256)), ''),
          nullif(trim(p_provider), ''), nullif(trim(p_provider_asset_id), ''), p_notes, auth.uid())
  returning id into v_id;

  update public.deliverable_packages
     set current_version_id = v_id, status = 'internal_qa', updated_at = now()
   where id = p_package_id;

  perform private.write_audit(v_pkg.org_id, 'version.submitted', 'deliverable_version', v_id, null,
    jsonb_build_object('package_id', p_package_id, 'version_number', v_next,
                       'content_sha256', p_content_sha256, 'provider_asset_id', p_provider_asset_id));
  return v_id;
end
$$;

create function public.add_source_evidence(
  p_version_id uuid,
  p_source_provider text,
  p_source_id text,
  p_url text,
  p_source_date date,
  p_provenance public.source_provenance
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_version public.deliverable_versions%rowtype;
  v_id uuid;
begin
  select * into v_version from public.deliverable_versions where id = p_version_id;
  if not found then
    raise exception 'version not found' using errcode = 'P0002';
  end if;
  perform private.require_role(v_version.org_id, array['owner', 'admin', 'csm']::public.member_role[]);

  insert into public.evidence_items (org_id, version_id, kind, source_provider, source_id, url, source_date,
                                     provenance, recorded_by)
  values (v_version.org_id, p_version_id, 'source', nullif(trim(p_source_provider), ''), nullif(trim(p_source_id), ''),
          nullif(trim(p_url), ''), p_source_date, p_provenance, auth.uid())
  returning id into v_id;

  perform private.write_audit(v_version.org_id, 'evidence.source_added', 'deliverable_version', p_version_id, null,
    jsonb_build_object('evidence_id', v_id, 'provider', p_source_provider, 'provenance', p_provenance));
  return v_id;
end
$$;

create function public.record_qa(
  p_version_id uuid,
  p_checklist_version text,
  p_result public.qa_result,
  p_findings text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_version public.deliverable_versions%rowtype;
  v_id uuid;
begin
  select * into v_version from public.deliverable_versions where id = p_version_id;
  if not found then
    raise exception 'version not found' using errcode = 'P0002';
  end if;
  -- Waiving QA is an owner/admin decision; CSMs may record pass/fail.
  if p_result = 'waived' then
    perform private.require_role(v_version.org_id, array['owner', 'admin']::public.member_role[]);
  else
    perform private.require_role(v_version.org_id, array['owner', 'admin', 'csm']::public.member_role[]);
  end if;

  insert into public.evidence_items (org_id, version_id, kind, qa_checklist_version, qa_result, findings, recorded_by)
  values (v_version.org_id, p_version_id, 'qa', trim(coalesce(p_checklist_version, '')), p_result, p_findings, auth.uid())
  returning id into v_id;

  perform private.write_audit(v_version.org_id, 'evidence.qa_recorded', 'deliverable_version', p_version_id, p_findings,
    jsonb_build_object('evidence_id', v_id, 'result', p_result, 'checklist_version', p_checklist_version));
  return v_id;
end
$$;

-- Internal gate: the current version needs source evidence and a passing (or waived) latest QA.
create function private.version_ready_for_review(p_version_id uuid) returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_latest_qa public.qa_result;
begin
  if not exists (select 1 from public.evidence_items where version_id = p_version_id and kind = 'source') then
    return 'missing source evidence for this version';
  end if;
  select qa_result into v_latest_qa from public.evidence_items
   where version_id = p_version_id and kind = 'qa'
   order by created_at desc, id desc limit 1;
  if v_latest_qa is null then
    return 'missing QA evidence for this version';
  end if;
  if v_latest_qa = 'fail' then
    return 'latest QA for this version failed';
  end if;
  return null;
end
$$;

create function public.send_for_client_review(p_package_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_pkg public.deliverable_packages;
  v_problem text;
begin
  v_pkg := private.lock_package(p_package_id, array['owner', 'admin', 'csm']::public.member_role[]);
  if v_pkg.status <> 'internal_qa' then
    raise exception 'package must be in internal QA (status is %)', v_pkg.status using errcode = '22023';
  end if;
  v_problem := private.version_ready_for_review(v_pkg.current_version_id);
  if v_problem is not null then
    raise exception '%', v_problem using errcode = '22023';
  end if;
  update public.deliverable_packages set status = 'client_review', updated_at = now() where id = p_package_id;
  perform private.write_audit(v_pkg.org_id, 'package.sent_for_client_review', 'deliverable_package', p_package_id, null,
    jsonb_build_object('version_id', v_pkg.current_version_id));
end
$$;

-- Records classified client feedback against the exact version under review and counts
-- revision rounds against the effective allowance. Exceeding the allowance is flagged,
-- never billed or blocked here.
create function public.record_feedback(
  p_version_id uuid,
  p_classification public.feedback_classification,
  p_requested_changes text,
  p_source_url text,
  p_author_label text,
  p_received_at timestamptz,
  p_counts_as_revision boolean
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_version public.deliverable_versions%rowtype;
  v_pkg public.deliverable_packages;
  v_rounds integer;
  v_policy public.revision_policy_status;
  v_round integer;
  v_counts boolean;
  v_scope_status public.feedback_scope_status;
  v_id uuid;
begin
  select * into v_version from public.deliverable_versions where id = p_version_id;
  if not found then
    raise exception 'version not found' using errcode = 'P0002';
  end if;
  v_pkg := private.lock_package(v_version.package_id, array['owner', 'admin', 'csm']::public.member_role[]);
  if v_pkg.status <> 'client_review' or v_pkg.current_version_id <> p_version_id then
    raise exception 'feedback must target the version currently in client review' using errcode = '22023';
  end if;

  select e.included_revision_rounds, e.revision_policy_status into v_rounds, v_policy
    from public.effective_revision_policy(v_pkg.scope_id) e;

  -- Scope changes are never counted as an included revision; they go to the owner.
  v_counts := coalesce(p_counts_as_revision, true) and p_classification <> 'scope_change';

  if p_classification = 'scope_change' then
    v_scope_status := 'scope_change_owner_review';
  elsif not v_counts then
    v_scope_status := 'not_a_revision';
  else
    select count(*) + 1 into v_round from public.feedback_items
     where package_id = v_pkg.id and counts_as_revision;
    if v_policy = 'unknown_review_required' then
      v_scope_status := 'allowance_unknown';
    elsif v_round > v_rounds then
      v_scope_status := 'exceeds_allowance';
    else
      v_scope_status := 'within_allowance';
    end if;
  end if;

  insert into public.feedback_items (org_id, package_id, version_id, source_url, author_label, received_at,
                                     classification, requested_changes, counts_as_revision, revision_round,
                                     scope_status, recorded_by)
  values (v_pkg.org_id, v_pkg.id, p_version_id, trim(coalesce(p_source_url, '')), trim(coalesce(p_author_label, '')),
          coalesce(p_received_at, now()), p_classification, trim(coalesce(p_requested_changes, '')), v_counts,
          case when v_counts then v_round end, v_scope_status, auth.uid())
  returning id into v_id;

  update public.deliverable_packages set status = 'revision_requested', updated_at = now() where id = v_pkg.id;

  perform private.write_audit(v_pkg.org_id, 'feedback.recorded', 'deliverable_version', p_version_id, null,
    jsonb_build_object('feedback_id', v_id, 'classification', p_classification, 'revision_round', v_round,
                       'scope_status', v_scope_status));
  return v_id;
end
$$;

-- Records approval of an exact version and unlocks dependent packages. The caller must
-- state the hash/asset ID they saw, so an asset swapped after review cannot be approved.
create function public.record_approval(
  p_version_id uuid,
  p_expected_sha256 text,
  p_expected_provider_asset_id text,
  p_approver_label text,
  p_evidence_url text,
  p_idempotency_key text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_version public.deliverable_versions%rowtype;
  v_pkg public.deliverable_packages;
  v_existing public.approval_events%rowtype;
  v_problem text;
  v_id uuid;
  v_unlocked text[];
begin
  select * into v_version from public.deliverable_versions where id = p_version_id;
  if not found then
    raise exception 'version not found' using errcode = 'P0002';
  end if;
  v_pkg := private.lock_package(v_version.package_id, array['owner', 'admin', 'csm']::public.member_role[]);

  if length(trim(coalesce(p_idempotency_key, ''))) = 0 then
    raise exception 'idempotency key required' using errcode = '22023';
  end if;
  select * into v_existing from public.approval_events
   where org_id = v_pkg.org_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.version_id <> p_version_id then
      raise exception 'idempotency key already used for a different version' using errcode = '23505';
    end if;
    return v_existing.id;
  end if;

  if v_pkg.status <> 'client_review' then
    raise exception 'package must be in client review to approve (status is %)', v_pkg.status using errcode = '22023';
  end if;
  if v_pkg.current_version_id <> p_version_id then
    raise exception 'only the version currently in review can be approved' using errcode = '22023';
  end if;
  if v_version.content_sha256 is distinct from nullif(lower(trim(p_expected_sha256)), '')
     or v_version.provider_asset_id is distinct from nullif(trim(p_expected_provider_asset_id), '') then
    raise exception 'approved asset identity does not match the stored version' using errcode = '22023';
  end if;
  v_problem := private.version_ready_for_review(p_version_id);
  if v_problem is not null then
    raise exception '%', v_problem using errcode = '22023';
  end if;

  insert into public.approval_events (org_id, package_id, version_id, version_number, content_sha256, provider_asset_id,
                                      approver_label, evidence_url, idempotency_key, recorded_by)
  values (v_pkg.org_id, v_pkg.id, p_version_id, v_version.version_number, v_version.content_sha256,
          v_version.provider_asset_id, trim(coalesce(p_approver_label, '')), trim(coalesce(p_evidence_url, '')),
          p_idempotency_key, auth.uid())
  returning id into v_id;

  update public.deliverable_packages
     set status = 'approved', approved_version_id = p_version_id, updated_at = now()
   where id = v_pkg.id;

  -- Unlock locked packages in the same scope whose dependencies are now all approved.
  with unlocked as (
    update public.deliverable_packages p
       set status = 'queued', updated_at = now()
     where p.scope_id = v_pkg.scope_id
       and p.status = 'locked'
       and not exists (
         select 1 from unnest(p.depends_on) as dep(key)
          where not exists (
            select 1 from public.deliverable_packages d
             where d.scope_id = p.scope_id and d.package_key = dep.key and d.status = 'approved'
          )
       )
    returning p.package_key
  )
  select coalesce(array_agg(package_key), '{}') into v_unlocked from unlocked;

  perform private.write_audit(v_pkg.org_id, 'version.approved', 'deliverable_version', p_version_id, null,
    jsonb_build_object('approval_id', v_id, 'package_id', v_pkg.id, 'version_number', v_version.version_number,
                       'content_sha256', v_version.content_sha256, 'evidence_url', p_evidence_url,
                       'unlocked', v_unlocked));
  return v_id;
end
$$;

revoke all on all functions in schema private from public, anon;

revoke all on function public.effective_revision_policy(uuid) from public, anon;
revoke all on function public.activate_fulfillment(uuid, text, integer, text, integer, text, text) from public, anon;
revoke all on function public.amend_revision_policy(uuid, integer, text, text) from public, anon;
revoke all on function public.start_package(uuid) from public, anon;
revoke all on function public.submit_version(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.add_source_evidence(uuid, text, text, text, date, public.source_provenance) from public, anon;
revoke all on function public.record_qa(uuid, text, public.qa_result, text) from public, anon;
revoke all on function public.send_for_client_review(uuid) from public, anon;
revoke all on function public.record_feedback(uuid, public.feedback_classification, text, text, text, timestamptz, boolean) from public, anon;
revoke all on function public.record_approval(uuid, text, text, text, text, text) from public, anon;

grant execute on function public.effective_revision_policy(uuid) to authenticated;
grant execute on function public.activate_fulfillment(uuid, text, integer, text, integer, text, text) to authenticated;
grant execute on function public.amend_revision_policy(uuid, integer, text, text) to authenticated;
grant execute on function public.start_package(uuid) to authenticated;
grant execute on function public.submit_version(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.add_source_evidence(uuid, text, text, text, date, public.source_provenance) to authenticated;
grant execute on function public.record_qa(uuid, text, public.qa_result, text) to authenticated;
grant execute on function public.send_for_client_review(uuid) to authenticated;
grant execute on function public.record_feedback(uuid, public.feedback_classification, text, text, text, timestamptz, boolean) to authenticated;
grant execute on function public.record_approval(uuid, text, text, text, text, text) to authenticated;
