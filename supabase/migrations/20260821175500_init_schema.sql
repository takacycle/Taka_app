-- Takacycle initial schema
-- Core entities per the tech-stack plan's data model sketch.
-- Design rule: points_ledger and pickup_evidence are append-only — no UPDATE/DELETE
-- policy is granted to any client role, so writes to them can only happen through a
-- server-side connection using the Supabase secret key (Edge Functions), which is what
-- makes the verification-before-points anti-fraud story actually enforceable.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ── Enums ─────────────────────────────────────────────────────────────────

create type pickup_status as enum (
  'requested', 'assigned', 'en_route', 'completed', 'verified', 'flagged', 'cancelled'
);

create type material_grade as enum ('clean_pet', 'mixed_recyclables', 'contaminated');

create type agent_reputation_status as enum ('good_standing', 'flagged_for_review', 'suspended');

create type badge_tier as enum ('bronze', 'silver', 'gold');

create type fraud_flag_reason as enum (
  'suspicious_pattern', 'audit_mismatch', 'duplicate_evidence', 'manual_report'
);

create type organization_type as enum ('school', 'business', 'community');

-- ── Reference data ───────────────────────────────────────────────────────

create table zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  boundary geography(Polygon, 4326),
  created_at timestamptz not null default now()
);
create index zones_boundary_idx on zones using gist (boundary);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type organization_type not null,
  zone_id uuid not null references zones(id),
  created_at timestamptz not null default now()
);
create index organizations_zone_id_idx on organizations(zone_id);

create table bins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  zone_id uuid not null references zones(id),
  label text not null,
  created_at timestamptz not null default now()
);
create index bins_organization_id_idx on bins(organization_id);

-- ── People ───────────────────────────────────────────────────────────────

create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  organization_id uuid references organizations(id),
  zone_id uuid references zones(id),
  created_at timestamptz not null default now()
);
create index app_users_zone_id_idx on app_users(zone_id);

-- Agents are provisioned by dispatcher staff (via the secret key), not self-signup,
-- but still authenticate as normal Supabase Auth users.
create table agents (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  zone_id uuid not null references zones(id),
  reputation_status agent_reputation_status not null default 'good_standing',
  rejection_rate numeric not null default 0,
  created_at timestamptz not null default now()
);
create index agents_zone_id_idx on agents(zone_id);

-- New auth.users rows default to a consumer profile unless raw_user_meta_data->>'role'
-- is 'agent' (agent accounts are inserted directly into `agents` by the dispatcher
-- console using the secret key, so this trigger skips them to avoid a duplicate row).
create function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data->>'role', 'consumer') = 'consumer' then
    insert into app_users (id, full_name, phone)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.phone, ''));
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ── Pickups ──────────────────────────────────────────────────────────────

create table pickups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id),
  agent_id uuid references agents(id),
  zone_id uuid not null references zones(id),
  status pickup_status not null default 'requested',
  requested_at timestamptz not null default now(),
  scheduled_at timestamptz,
  pickup_location geography(Point, 4326) not null,
  completed_at timestamptz
);
create index pickups_user_id_idx on pickups(user_id);
create index pickups_agent_id_idx on pickups(agent_id);
create index pickups_zone_id_status_idx on pickups(zone_id, status);
create index pickups_location_idx on pickups using gist (pickup_location);

create table pickup_evidence (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid not null references pickups(id),
  photo_url text not null,
  scale_reading_kg numeric not null,
  material_grade material_grade not null,
  gps_location geography(Point, 4326) not null,
  captured_at timestamptz not null default now(),
  is_audit_sample boolean not null default false
);
create index pickup_evidence_pickup_id_idx on pickup_evidence(pickup_id);

create table quality_audits (
  id uuid primary key default gen_random_uuid(),
  pickup_evidence_id uuid not null references pickup_evidence(id),
  auditor_agent_id uuid references agents(id),
  result text not null,
  notes text,
  created_at timestamptz not null default now()
);
create index quality_audits_pickup_evidence_id_idx on quality_audits(pickup_evidence_id);

-- ── Points, badges, fraud ────────────────────────────────────────────────

create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id),
  pickup_id uuid not null references pickups(id),
  kg_verified numeric not null,
  multiplier numeric not null,
  points_awarded numeric not null,
  created_at timestamptz not null default now()
);
create index points_ledger_user_id_idx on points_ledger(user_id);

create table badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id),
  tier badge_tier not null,
  awarded_at timestamptz not null default now(),
  unique (user_id, tier)
);
create index badges_user_id_idx on badges(user_id);

create table fraud_flags (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid not null references pickups(id),
  agent_id uuid references agents(id),
  reason fraud_flag_reason not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index fraud_flags_pickup_id_idx on fraud_flags(pickup_id);
create index fraud_flags_agent_id_idx on fraud_flags(agent_id);

-- ── Rewards & engagement ─────────────────────────────────────────────────

create table rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  points_cost numeric not null,
  is_active boolean not null default true
);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id),
  reward_id uuid not null references rewards(id),
  points_spent numeric not null,
  redeemed_at timestamptz not null default now()
);
create index redemptions_user_id_idx on redemptions(user_id);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone_id uuid references zones(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  target_kg numeric not null
);
create index challenges_zone_id_idx on challenges(zone_id);

-- ── Row Level Security ───────────────────────────────────────────────────

alter table zones enable row level security;
alter table organizations enable row level security;
alter table bins enable row level security;
alter table app_users enable row level security;
alter table agents enable row level security;
alter table pickups enable row level security;
alter table pickup_evidence enable row level security;
alter table quality_audits enable row level security;
alter table points_ledger enable row level security;
alter table badges enable row level security;
alter table fraud_flags enable row level security;
alter table rewards enable row level security;
alter table redemptions enable row level security;
alter table challenges enable row level security;

-- Public reference data: readable by anyone (incl. pre-login onboarding pickers).
create policy "zones_read_all" on zones for select using (true);
create policy "organizations_read_all" on organizations for select using (true);
create policy "bins_read_all" on bins for select using (true);
create policy "rewards_read_active" on rewards for select using (is_active = true);
create policy "challenges_read_all" on challenges for select using (true);

-- Consumers: can see/edit only their own profile.
create policy "app_users_select_own" on app_users for select using (id = auth.uid());
create policy "app_users_update_own" on app_users for update using (id = auth.uid()) with check (id = auth.uid());

-- Agents: can see their own profile. Reputation/rejection-rate are server-managed —
-- deliberately no UPDATE policy, so agents cannot edit those from the client.
create policy "agents_select_own" on agents for select using (id = auth.uid());

-- Pickups: a consumer sees/creates their own; an agent sees ones assigned to them.
create policy "pickups_select_own_or_assigned" on pickups
  for select using (user_id = auth.uid() or agent_id = auth.uid());
create policy "pickups_insert_own" on pickups
  for insert with check (user_id = auth.uid());
create policy "pickups_update_assigned_agent" on pickups
  for update using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create policy "pickups_cancel_own" on pickups
  for update using (user_id = auth.uid() and status = 'requested')
  with check (user_id = auth.uid() and status = 'cancelled');

-- Pickup evidence: visible to the pickup's consumer and assigned agent; insertable
-- only by the assigned agent; never updatable/deletable by any client role.
create policy "pickup_evidence_select" on pickup_evidence
  for select using (
    exists (
      select 1 from pickups p
      where p.id = pickup_evidence.pickup_id
        and (p.user_id = auth.uid() or p.agent_id = auth.uid())
    )
  );
create policy "pickup_evidence_insert_assigned_agent" on pickup_evidence
  for insert with check (
    exists (select 1 from pickups p where p.id = pickup_evidence.pickup_id and p.agent_id = auth.uid())
  );

-- Points ledger, badges: readable by the owning user; writable only by the secret key
-- (Edge Function), never by a client — this is what makes points unforgeable.
create policy "points_ledger_select_own" on points_ledger for select using (user_id = auth.uid());
create policy "badges_select_own" on badges for select using (user_id = auth.uid());

-- Redemptions: readable by the owning user; writable only by the secret key (Edge
-- Function validates sufficient balance before spending).
create policy "redemptions_select_own" on redemptions for select using (user_id = auth.uid());

-- fraud_flags and quality_audits: no client policies at all — staff-only, accessed by
-- the dispatcher console's server-side Supabase client using the secret key.
