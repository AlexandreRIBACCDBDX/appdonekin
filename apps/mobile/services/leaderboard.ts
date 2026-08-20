import { supabase } from '@/lib/supabase';

export interface LeaderboardEntry {
  member_id: string;
  first_name: string;
  avatar_url: string | null;
  points_earned: number;
}

export async function fetchWeeklyLeaderboard(circleId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('circle_weekly_leaderboard', { p_circle_id: circleId });
  if (error) throw error;
  return data ?? [];
}
