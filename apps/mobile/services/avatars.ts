import { supabase } from '@/lib/supabase';

// Uploads a picked local image to the `avatars` bucket and returns its
// public URL. Shared by both self and guardian-managed-child photo flows —
// the path's top-level folder is the circle_members id, which is exactly
// what the storage RLS policies (20260813091800_avatar_storage.sql) check
// via can_edit_member_profile().
export async function uploadMemberAvatar(memberId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const path = `${memberId}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
