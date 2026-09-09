-- Supports the consumer account-deletion flow (delete-account edge function). The
-- account is anonymized in place rather than deleted, since pickups/points_ledger/
-- badges/redemptions all reference app_users with no ON DELETE clause (NO ACTION) --
-- deleting the row would hit a foreign-key violation for any user with history, and
-- cascading through those tables would destroy the fraud/audit trail they exist for.
alter table app_users add column deleted_at timestamptz;

-- Re-published to exclude anonymized accounts from live leaderboards. kg/points
-- history is untouched (see the migration comment above) — this only affects
-- whether a deleted user's ("Deleted user") row still surfaces here.
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
    and au.deleted_at is null
    and (p_since is null or pl.created_at >= p_since)
  group by pl.user_id, au.full_name
  order by rank;
$$;
