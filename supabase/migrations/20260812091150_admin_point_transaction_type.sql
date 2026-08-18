-- DoneKin schema — 13: add the admin manual-adjustment ledger type
--
-- Split into its own migration/transaction: PostgreSQL requires a new enum
-- value to be committed before it can be referenced by name in the same
-- session (the admin RPC functions added in a later migration use it).

alter type point_transaction_type add value if not exists 'admin_adjustment';
