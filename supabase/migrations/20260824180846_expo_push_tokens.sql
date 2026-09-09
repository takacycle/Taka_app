-- Push notifications need somewhere to store each device's Expo push token.
-- app_users already has an unrestricted self-update policy, so no RLS change is
-- needed there. agents only has column-restricted self-update (see the live-location
-- migration) — same reasoning applies here: low-stakes telemetry, so agents can set
-- their own token, but the grant stays scoped to just this column.

alter table app_users add column expo_push_token text;
alter table agents add column expo_push_token text;

grant update (expo_push_token) on agents to authenticated;
