-- Avatar storage — profile photos for circle members (self and
-- guardian-managed children share the same table + permission check, so
-- one bucket covers both).
--
-- Path convention: objects live at `{circle_member_id}/{filename}`. The
-- top-level folder segment is the member's id, so the same
-- can_edit_member_profile() used for the circle_members UPDATE policy
-- (20260812090900_rls_policies.sql) governs writes here too — a member can
-- set their own photo, a circle admin can set anyone's, and a guardian with
-- can_edit_profile=true can set a managed child's.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_insert_authorized on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and public.can_edit_member_profile(((storage.foldername(name))[1])::uuid)
  );

create policy avatars_update_authorized on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and public.can_edit_member_profile(((storage.foldername(name))[1])::uuid)
  );

create policy avatars_delete_authorized on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and public.can_edit_member_profile(((storage.foldername(name))[1])::uuid)
  );

-- Defensive — the bucket's own public=true already serves reads via the
-- public URL endpoint without going through RLS, but this keeps direct
-- object-API reads consistent too.
create policy avatars_public_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');
