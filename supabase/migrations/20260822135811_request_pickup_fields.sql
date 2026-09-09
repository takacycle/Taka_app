-- Fields the Request Pickup flow needs that the initial schema didn't anticipate:
-- which weekdays a zone runs pickups on, and the human-readable address/notes/sack
-- count captured on a pickup request (pickup_location alone isn't enough — agents
-- and the dispatcher console need a readable address, not just coordinates).

alter table zones
  add column pickup_days smallint[] not null default '{}';
comment on column zones.pickup_days is 'ISO weekday numbers this zone runs pickups on (1=Monday .. 7=Sunday).';

alter table pickups
  add column address_text text not null default '',
  add column notes text,
  add column sack_count integer not null default 1 check (sack_count between 1 and 10);

-- Seed one real zone so the pickup flow is testable end-to-end. Replace/extend as
-- you onboard real partner zones — this isn't meant to be the permanent way zones
-- get created.
insert into zones (name, city, pickup_days)
values ('Zone 1, Ring Rd East', 'Cape Coast', array[2, 5]::smallint[])
on conflict do nothing;
