import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchWeeklyLeaderboard } from '@/services/leaderboard';

export function useWeeklyLeaderboard(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.leaderboard(circleId ?? 'none'),
    queryFn: () => fetchWeeklyLeaderboard(circleId as string),
    enabled: !!circleId,
  });
}
