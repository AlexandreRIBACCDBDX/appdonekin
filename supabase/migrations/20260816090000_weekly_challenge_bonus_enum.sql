-- DoneKin schema — 35: weekly circle challenge — enum value
--
-- New point_transaction_type for the collective weekly challenge bonus
-- (see next migration). Enum values must be added in their own
-- transaction/migration, separate from anything that references them —
-- established convention in this schema (see admin_point_transaction_type,
-- late_penalty_enum, project_payment_enum).

alter type point_transaction_type add value if not exists 'weekly_challenge_bonus';
