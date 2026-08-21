import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useWeeklyChallenge } from '@/hooks/useChallenges';
import { queryKeys } from '@/lib/queryKeys';

// A cooperative counterpart to the (individual) WeeklyLeaderboard: one
// shared target for the whole circle. Fetching this is also what pays the
// bonus out (see services/challenges.ts) — once bonus_paid flips true, the
// wallet/leaderboard queries are invalidated so the new balance shows up
// without waiting for their own refetch interval.
export function WeeklyChallengeCard() {
  const { colors, spacing, radius, typography, gradients } = useTheme();
  const { circle } = useActiveCircle();
  const { data } = useWeeklyChallenge(circle?.id ?? null);
  const queryClient = useQueryClient();
  const didInvalidate = useRef(false);

  useEffect(() => {
    if (data?.bonus_paid && !didInvalidate.current && circle) {
      didInvalidate.current = true;
      queryClient.invalidateQueries({ queryKey: queryKeys.circleWallets(circle.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard(circle.id) });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    }
  }, [data?.bonus_paid, circle, queryClient]);

  if (!data) return null;

  const percent = data.target > 0 ? Math.min(100, Math.round((data.total / data.target) * 100)) : 0;

  return (
    <Card style={{ padding: spacing.xl }}>
      <Text style={[typography.heading, { color: colors.textPrimary }]}>Défi de la semaine</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
        Toute la famille cumule des Dones ensemble
      </Text>

      {data.bonus_paid ? (
        <View style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 22 }}>🎉</Text>
          <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
            Objectif atteint — +{data.bonus_amount} Dones pour tout le monde !
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
          <View
            style={{
              height: 8,
              borderRadius: radius.full,
              backgroundColor: colors.surfaceMuted,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: `${percent}%`, height: '100%' }}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <DonesAmount
              value={`${data.total} / ${data.target}`}
              size={13}
              gap={4}
              textStyle={[typography.caption, { color: colors.textSecondary }]}
            />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{percent}%</Text>
          </View>
        </View>
      )}
    </Card>
  );
}
