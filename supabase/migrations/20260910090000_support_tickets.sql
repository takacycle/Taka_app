-- Consumers and agents can each file a support ticket about themselves (or, for
-- an agent, about a specific pickup). Unlike fraud_flags/quality_audits (which are
-- staff-only, zero client RLS policies), this table needs self-service INSERT+SELECT
-- so a filer can see their own ticket's status/resolution -- but no UPDATE policy for
-- authenticated at all, so resolving only ever happens through the dispatcher's
-- admin/service-role client.
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references app_users(id),
  agent_id uuid references agents(id),
  pickup_id uuid references pickups(id),
  category text not null,
  description text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text,
  check (num_nonnulls(consumer_id, agent_id) = 1)
);
create index support_tickets_consumer_id_idx on support_tickets(consumer_id);
create index support_tickets_agent_id_idx on support_tickets(agent_id);

alter table support_tickets enable row level security;

-- Same OR-across-two-owner-columns idiom pickups_select_own_or_assigned already
-- uses for SELECT (app_users.id and agents.id are both FKs to auth.users(id), so
-- auth.uid() matches whichever owner column is set) -- first use of it on INSERT.
create policy "support_tickets_insert_own" on support_tickets
  for insert with check (consumer_id = auth.uid() or agent_id = auth.uid());
create policy "support_tickets_select_own" on support_tickets
  for select using (consumer_id = auth.uid() or agent_id = auth.uid());
