-- Challenge progress needs cross-user aggregation of points_ledger for everyone in
-- the challenge's zone, which RLS only allows for a user's own rows — same problem
-- and same fix as get_zone_leaderboard. kg_verified already nets out fraud reversals
-- (see resolveFraudFlag's negative compensating entries), so no extra filtering is
-- needed here for that.
create or replace function get_challenge_progress(p_challenge_id uuid)
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(pl.kg_verified), 0)
  from points_ledger pl
  join app_users au on au.id = pl.user_id
  join challenges c on c.id = p_challenge_id
  where au.zone_id = c.zone_id
    and pl.created_at >= c.starts_at
    and pl.created_at <= c.ends_at
$$;

grant execute on function get_challenge_progress(uuid) to authenticated;
