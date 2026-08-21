import { supabase } from '@/lib/supabase';

// feature_flags has a public SELECT policy specifically so screens like
// this can read it directly, with no session and no RPC — needed here
// since maintenance mode must be able to block logged-out users too.
export async function fetchFeatureFlag(key: string): Promise<boolean> {
  const { data, error } = await supabase.from('feature_flags').select('enabled').eq('key', key).maybeSingle();
  if (error) throw error;
  return data?.enabled ?? false;
}
