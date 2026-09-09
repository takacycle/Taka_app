-- Live Map needs agents to report their current position. Location is low-stakes
-- telemetry (unlike reputation_status/rejection_rate, which stay admin-only), so
-- agents can update it themselves — but only those two columns. RLS controls which
-- ROWS an agent can touch (their own); the column-level GRANT controls which COLUMNS,
-- so this can't be used to edit reputation_status or rejection_rate.

alter table agents
  add column current_location geography(Point, 4326),
  add column location_updated_at timestamptz;

create policy "agents_update_own_location" on agents
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on agents from authenticated;
grant update (current_location, location_updated_at) on agents to authenticated;

create index agents_current_location_idx on agents using gist (current_location);
