-- DoneKin schema — 37: maintenance mode feature flag
--
-- Reuses the existing feature_flags mechanism rather than building a new
-- one: the table already has a public SELECT policy
-- (feature_flags_select_anyone, from 20260812091300) specifically so the
-- mobile app can read flags directly without an RPC or even a session —
-- exactly what a maintenance gate needs, since it must work for logged-out
-- users too. Toggling it needs no new admin UI either: the Configuration
-- page already renders a switch for every row in this table.

insert into feature_flags (key, enabled, description) values
  ('maintenance_mode_enabled', false, 'Mobile app shows a maintenance screen instead of the normal app when on.')
on conflict (key) do nothing;
