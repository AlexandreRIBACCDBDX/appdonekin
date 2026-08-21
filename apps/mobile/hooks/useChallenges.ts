import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchWeeklyChallenge } from '@/services/challenges';

export function useWeeklyChallenge(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.weeklyChallenge(circleId ?? 'none'),
    queryFn: () => fetchWeeklyChallenge(circleId as string),
    enabled: !!circleId,
  });
}
