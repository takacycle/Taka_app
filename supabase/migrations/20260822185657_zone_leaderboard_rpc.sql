-- Leaderboards need cross-user aggregation of points_ledger, which RLS only allows
-- for a user's own rows. Same pattern as the pickup-tracking RPC: a narrow SECURITY
-- DEFINER function that only ever returns name + aggregated kg/points (never phone or
-- other PII), scoped to one zone — matches "Local Leaderboards" from the design doc.
-- p_since lets the client ask for an all-time or a rolling-window leaderboard (e.g.
-- "This Week") without a second function.
create or replace function get_zone_leaderboard(p_zone_id uuid, p_since timestamptz default null)
returns table (
  user_id uuid,
  full_name text,
  total_kg numeric,
  total_points numeric,
  rank bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    pl.user_id,
    au.full_name,
    sum(pl.kg_verified) as total_kg,
    sum(pl.points_awarded) as total_points,
    row_number() over (order by sum(pl.kg_verified) desc) as rank
  from points_ledger pl
  join app_users au on au.id = pl.user_id
  where au.zone_id = p_zone_id
    and (p_since is null or pl.created_at >= p_since)
  group by pl.user_id, au.full_name
  order by rank;
$$;

grant execute on function get_zone_leaderboard(uuid, timestamptz) to authenticated;
