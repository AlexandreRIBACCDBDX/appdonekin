import { supabase } from '@/lib/supabase';

export interface WeeklyChallenge {
  target: number;
  total: number;
  reached: boolean;
  bonus_paid: boolean;
  bonus_amount: number;
}

// Pays out the collective bonus itself the first time it notices the
// target was reached this week (idempotent server-side) — so simply
// fetching this is also what settles the challenge, same lazy-on-read
// pattern as the rest of this schema's time-boundary effects.
export async function fetchWeeklyChallenge(circleId: string): Promise<WeeklyChallenge> {
  const { data, error } = await supabase.rpc('get_circle_weekly_challenge', { p_circle_id: circleId });
  if (error) throw error;
  return data as unknown as WeeklyChallenge;
}
