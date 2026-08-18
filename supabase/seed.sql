-- DoneKin demo data: "Famille Martin"
--
-- Run locally with `supabase db reset` (applies migrations then this file)
-- or `psql ... -f supabase/seed.sql` against a fresh dev project.
--
-- Login as any of paul@donekin.demo / julie@donekin.demo / emma@donekin.demo
-- with password: donekin123
--
-- Lucas (6 ans) has NO auth.users row at all — he only exists as a
-- guardian_managed circle_member, exactly as the product spec requires.
--
-- admin@donekin.demo / donekin123 is a DoneKin platform super_admin — a
-- separate authority system from circle roles, deliberately not a member
-- of Famille Martin at all (see platform_admins / migrations 14-16).
--
-- NOTE: this script inserts directly into auth.users and point_transactions.
-- That is only safe here because it runs as the Postgres superuser against
-- your own dev project, bypassing RLS entirely — never do either of those
-- things from application code.

do $$
declare
  v_paul uuid := 'a0000000-0000-4000-8000-000000000001';
  v_julie uuid := 'a0000000-0000-4000-8000-000000000002';
  v_emma uuid := 'a0000000-0000-4000-8000-000000000003';
  v_admin uuid := 'a0000000-0000-4000-8000-000000000099';
  v_circle_id uuid;
  v_paul_member uuid;
  v_julie_member uuid;
  v_emma_member uuid;
  v_lucas_member uuid;
  v_task_bed uuid;
  v_completion_bed uuid;
  v_project_id uuid;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  ) values
    ('00000000-0000-0000-0000-000000000000', v_paul, 'authenticated', 'authenticated',
     'paul@donekin.demo', crypt('donekin123', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Paul Martin"}'),
    ('00000000-0000-0000-0000-000000000000', v_julie, 'authenticated', 'authenticated',
     'julie@donekin.demo', crypt('donekin123', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Julie Martin"}'),
    ('00000000-0000-0000-0000-000000000000', v_emma, 'authenticated', 'authenticated',
     'emma@donekin.demo', crypt('donekin123', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Emma Martin"}'),
    ('00000000-0000-0000-0000-000000000000', v_admin, 'authenticated', 'authenticated',
     'admin@donekin.demo', crypt('donekin123', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"DoneKin Admin"}')
  on conflict (id) do nothing;
  -- profiles rows are created automatically by the on_auth_user_created trigger.

  insert into platform_admins (user_id, role, is_active, created_by)
  values (v_admin, 'super_admin', true, v_admin)
  on conflict (user_id) do nothing;

  insert into circles (id, name, type, created_by_user_id)
  values (gen_random_uuid(), 'Famille Martin', 'family', v_paul)
  returning id into v_circle_id;

  insert into circle_members (id, circle_id, user_id, first_name, member_type, role, access_mode, has_phone, created_by_user_id)
  values (gen_random_uuid(), v_circle_id, v_paul, 'Paul', 'parent', 'owner', 'personal_account', true, v_paul)
  returning id into v_paul_member;

  insert into circle_members (id, circle_id, user_id, first_name, member_type, role, access_mode, has_phone, created_by_user_id)
  values (gen_random_uuid(), v_circle_id, v_julie, 'Julie', 'parent', 'admin', 'personal_account', true, v_paul)
  returning id into v_julie_member;

  insert into circle_members (id, circle_id, user_id, first_name, member_type, role, access_mode, has_phone, created_by_user_id)
  values (gen_random_uuid(), v_circle_id, v_emma, 'Emma', 'child', 'member', 'personal_account', true, v_paul)
  returning id into v_emma_member;

  insert into circle_members (id, circle_id, user_id, first_name, member_type, role, access_mode, has_phone, birth_date, created_by_user_id)
  values (gen_random_uuid(), v_circle_id, null, 'Lucas', 'child', 'child', 'guardian_managed', false, date '2020-03-15', v_paul)
  returning id into v_lucas_member;

  insert into guardian_relationships (circle_id, guardian_member_id, managed_member_id, created_by_user_id)
  values
    (v_circle_id, v_paul_member, v_lucas_member, v_paul),
    (v_circle_id, v_julie_member, v_lucas_member, v_paul);

  insert into rewards (circle_id, name, description, cost_points, created_by_member_id, created_by_user_id)
  values
    (v_circle_id, 'Choisir le dessert', 'Choisis le dessert de ce soir', 10, v_paul_member, v_paul),
    (v_circle_id, 'Choisir le film', 'Choisis le film de la soirée', 20, v_paul_member, v_paul),
    (v_circle_id, 'Soirée pizza', 'Une soirée pizza rien que pour toi', 30, v_paul_member, v_paul),
    (v_circle_id, 'Activité spéciale', 'Une sortie ou activité au choix', 50, v_paul_member, v_paul),
    (v_circle_id, 'Cadeau', 'Un petit cadeau surprise', 100, v_paul_member, v_paul);

  insert into projects (id, circle_id, title, description, created_by_member_id, created_by_user_id, due_date)
  values (gen_random_uuid(), v_circle_id, 'Préparer les vacances', 'Organiser l''été 2026', v_julie_member, v_julie, now() + interval '30 days')
  returning id into v_project_id;

  -- Open tasks
  insert into tasks (circle_id, title, assigned_to_member_id, created_by_member_id, created_by_user_id, points, status, requires_validation, priority)
  values
    (v_circle_id, 'Ranger sa chambre', v_lucas_member, v_paul_member, v_paul, 3, 'todo', true, 'medium'),
    (v_circle_id, 'Faire la vaisselle', v_emma_member, v_julie_member, v_julie, 2, 'todo', false, 'low'),
    (v_circle_id, 'Faire les courses', v_paul_member, v_paul_member, v_paul, 5, 'todo', false, 'medium'),
    (v_circle_id, 'Préparer les valises', v_julie_member, v_julie_member, v_julie, 4, 'in_progress', false, 'high');

  insert into tasks (circle_id, project_id, title, assigned_to_member_id, created_by_member_id, created_by_user_id, points, status, requires_validation, priority)
  values (v_circle_id, v_project_id, 'Réserver le gîte', v_julie_member, v_julie_member, v_julie, 5, 'todo', false, 'high');

  -- A task Lucas already completed, recorded by Paul and validated by Paul —
  -- the flagship "performed_by vs recorded_by" scenario from the spec.
  insert into tasks (id, circle_id, title, assigned_to_member_id, created_by_member_id, created_by_user_id, points, status, requires_validation, priority)
  values (gen_random_uuid(), v_circle_id, 'Faire son lit', v_lucas_member, v_paul_member, v_paul, 1, 'completed', true, 'low')
  returning id into v_task_bed;

  insert into task_completions (id, task_id, circle_id, performed_by_member_id, recorded_by_user_id, status, points_awarded, validated_by_member_id, validated_by_user_id, submitted_at, validated_at)
  values (gen_random_uuid(), v_task_bed, v_circle_id, v_lucas_member, v_paul, 'approved', 1, v_paul_member, v_paul, now() - interval '1 day', now() - interval '1 day')
  returning id into v_completion_bed;

  -- Seed ledger history directly (bootstrap fixture only — see file header).
  insert into point_transactions (circle_id, member_id, amount, type, task_id, task_completion_id, created_by_user_id, created_at)
  values (v_circle_id, v_lucas_member, 1, 'task_reward', v_task_bed, v_completion_bed, v_paul, now() - interval '1 day');

  insert into point_transactions (circle_id, member_id, amount, type, created_by_user_id, created_at)
  values
    (v_circle_id, v_lucas_member, 47, 'manual_adjustment', v_paul, now() - interval '10 days'),
    (v_circle_id, v_paul_member, 126, 'manual_adjustment', v_paul, now() - interval '10 days'),
    (v_circle_id, v_julie_member, 143, 'manual_adjustment', v_paul, now() - interval '10 days'),
    (v_circle_id, v_emma_member, 82, 'manual_adjustment', v_paul, now() - interval '10 days');

  insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, task_id, points, metadata, created_at)
  values (v_circle_id, 'task_completed', v_lucas_member, v_paul, v_lucas_member, v_task_bed, 1, jsonb_build_object('title', 'Faire son lit'), now() - interval '1 day');
end $$;
