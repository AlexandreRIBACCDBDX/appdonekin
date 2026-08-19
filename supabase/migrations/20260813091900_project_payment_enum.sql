-- DoneKin schema — 21: project-payment enum value
--
-- Split into its own migration/transaction, same reason as
-- 20260812091150_admin_point_transaction_type.sql and
-- 20260813091600_late_penalty_enum.sql: a new enum value must be committed
-- before it can be referenced by name in the same session — the function
-- using it is added in the next migration.

alter type point_transaction_type add value if not exists 'project_payment';
