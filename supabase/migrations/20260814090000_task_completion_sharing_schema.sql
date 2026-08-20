-- DoneKin schema — 23: shared task completions
--
-- Lets a personal task (no project_id — a project task's points already go
-- to the shared pool, not to individuals, so splitting doesn't apply there)
-- be credited to more than one member when it was done with help. Recorded
-- at completion time so validate_task_completion() can credit the same
-- split later, for tasks that require validation.

alter table task_completions add column shared_with_member_ids uuid[];

comment on column task_completions.shared_with_member_ids is
  'Other members who helped, in addition to performed_by_member_id — the task''s points are split evenly across performer + these. Only meaningful when the task has no project_id.';
