-- Atomic redemption: validates the reward is active and the user has enough points,
-- then inserts the redemption — all inside one function call/transaction, with a row
-- lock on the user to serialize concurrent redemption attempts (otherwise two
-- simultaneous requests could both pass the balance check before either commits,
-- letting a user overspend). NOT granted to `authenticated` — this is only reachable
-- via the redeem-reward Edge Function's service-role client, which has already
-- verified the caller's identity from their JWT and passes it as p_user_id. Same
-- "server validates, client never writes directly" pattern as points_ledger.
create or replace function redeem_reward(p_user_id uuid, p_reward_id uuid)
returns table (redemption_id uuid, new_balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward record;
  v_balance numeric;
  v_redemption_id uuid;
begin
  perform 1 from app_users where id = p_user_id for update;

  select id, points_cost, is_active into v_reward from rewards where id = p_reward_id;
  if not found or not v_reward.is_active then
    raise exception 'Reward not found or inactive';
  end if;

  select coalesce(sum(pl.points_awarded), 0) - coalesce(
    (select sum(r.points_spent) from redemptions r where r.user_id = p_user_id), 0
  )
  into v_balance
  from points_ledger pl
  where pl.user_id = p_user_id;

  if v_balance < v_reward.points_cost then
    raise exception 'Insufficient points balance';
  end if;

  insert into redemptions (user_id, reward_id, points_spent)
  values (p_user_id, v_reward.id, v_reward.points_cost)
  returning id into v_redemption_id;

  return query select v_redemption_id, v_balance - v_reward.points_cost;
end;
$$;
