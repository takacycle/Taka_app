-- Track Pickup needs to show the assigned agent's live location, but the agents
-- table has no policy letting a consumer read anything about an agent at all (only
-- `agents_select_own`). Rather than widen agents' RLS — which would either expose
-- agents broadly or require column-level grants that conflict with the agent's own
-- self-select of reputation_status — expose a narrow SECURITY DEFINER function that
-- only returns the agent assigned to a pickup the caller actually owns, and only the
-- fields relevant to tracking (never phone, reputation_status, rejection_rate).
create or replace function get_pickup_agent_location(p_pickup_id uuid)
returns table (
  agent_full_name text,
  agent_lat double precision,
  agent_lng double precision,
  location_updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select a.full_name, a.current_lat, a.current_lng, a.location_updated_at
  from pickups p
  join agents a on a.id = p.agent_id
  where p.id = p_pickup_id
    and p.user_id = auth.uid();
$$;

grant execute on function get_pickup_agent_location(uuid) to authenticated;
