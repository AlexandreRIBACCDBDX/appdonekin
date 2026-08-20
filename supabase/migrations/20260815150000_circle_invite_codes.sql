-- DoneKin schema — 32: circle invite codes (short, permanent, shareable)
--
-- The existing invitation system (invitations.token: 48 hex chars, expires
-- in 7 days, usually tied to an email) is built for a targeted, one-off
-- invite. This adds a second, orthogonal mechanism: one short, permanent
-- code per circle that anyone can be given to join directly — no email, no
-- expiry, regenerable by an admin if it leaks.
--
-- Visible only to existing members: circles' own SELECT RLS
-- (circles_select_member, is_circle_member(id)) already restricts reading
-- the row a code lives on — no new policy needed. The joining NON-member
-- can't SELECT circles directly, so join_circle_by_code() looks it up with
-- SECURITY DEFINER privileges, same pattern as accept_invitation() already
-- uses for invitations.

alter table circles add column invite_code text unique;

-- Readable charset — no 0/O or 1/I/L, so a code read aloud or handwritten
-- is never ambiguous.
create or replace function generate_circle_invite_code()
returns text
language plpgsql
as $$
declare
  v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := '';
    for i in 1..7 loop
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
    end loop;
    select exists(select 1 from circles where invite_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

-- Backfill every existing circle with a code, then make it mandatory going
-- forward (new circles get one automatically via the column default).
update circles set invite_code = generate_circle_invite_code() where invite_code is null;

alter table circles alter column invite_code set not null;
alter table circles alter column invite_code set default generate_circle_invite_code();

create or replace function join_circle_by_code(p_code text)
returns circle_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_circle circles;
  v_member circle_members;
  v_display_name text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_circle from circles
  where invite_code = upper(replace(trim(p_code), '-', ''));
  if v_circle is null then
    raise exception 'invalid_code';
  end if;

  if exists (select 1 from circle_members where circle_id = v_circle.id and user_id = v_uid) then
    raise exception 'already_a_member';
  end if;

  select full_name into v_display_name from profiles where id = v_uid;

  insert into circle_members (
    circle_id, user_id, first_name, member_type, role, access_mode, has_phone, created_by_user_id
  ) values (
    v_circle.id, v_uid, coalesce(v_display_name, 'Membre'), 'friend', 'member', 'personal_account', true, v_uid
  ) returning * into v_member;

  insert into activity_events (circle_id, type, actor_user_id, subject_member_id, metadata)
  values (v_circle.id, 'member_joined', v_uid, v_member.id, jsonb_build_object('first_name', v_member.first_name));

  return v_member;
end;
$$;

create or replace function regenerate_circle_invite_code(p_circle_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_code text;
begin
  if not is_circle_admin(p_circle_id) then
    raise exception 'not_authorized';
  end if;

  v_new_code := generate_circle_invite_code();
  update circles set invite_code = v_new_code where id = p_circle_id;
  return v_new_code;
end;
$$;

grant execute on function join_circle_by_code(text) to authenticated;
grant execute on function regenerate_circle_invite_code(uuid) to authenticated;
