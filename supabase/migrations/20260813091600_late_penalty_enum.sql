-- DoneKin schema — 20: late-penalty enum values
--
-- Split into its own migration/transaction, same reason as
-- 20260812091150_admin_point_transaction_type.sql: a new enum value must be
-- committed before it can be referenced by name in the same session — the
-- functions using these are added in the next migration.

alter type point_transaction_type add value if not exists 'late_penalty';
alter type notification_type add value if not exists 'late_penalty';
