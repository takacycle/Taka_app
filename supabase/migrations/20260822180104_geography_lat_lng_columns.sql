-- PostgREST returns `geography` columns as raw EWKB hex, not GeoJSON — every client
-- read of pickup_location/current_location was assuming a {type, coordinates} shape
-- that was never actually being returned. Rather than parse WKB hex on every client
-- (RN, Next.js), add generated lat/lng columns that stay in sync automatically and
-- select those instead. The geography columns remain the source of truth for
-- geospatial queries (GIST indexes, ST_DWithin, etc.) — these are just a read-friendly
-- projection of them.

alter table pickups
  add column pickup_lat double precision generated always as (st_y(pickup_location::geometry)) stored,
  add column pickup_lng double precision generated always as (st_x(pickup_location::geometry)) stored;

alter table agents
  add column current_lat double precision generated always as (st_y(current_location::geometry)) stored,
  add column current_lng double precision generated always as (st_x(current_location::geometry)) stored;
