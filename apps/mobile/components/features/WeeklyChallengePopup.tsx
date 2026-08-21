import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useWeeklyChallenge } from '@/hooks/useChallenges';
import { queryKeys } from '@/lib/queryKeys';

// Ephemeral by design: pops up once per time this screen mounts (not
// pinned permanently like the leaderboard), read it, close it. Fetching
// the challenge is also what settles/pays it server-side — unrelated to
// whether the popup is shown or dismissed.
export function WeeklyChallengePopup() {
  const { colors, spacing, radius, typography, gradients } = useTheme();
  const { circle } = useActiveCircle();
  const { data } = useWeeklyChallenge(circle?.id ?? null);
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const hasShown = useRef(false);
  const didInvalidate = useRef(false);

  useEffect(() => {
    if (data && !hasShown.current) {
      hasShown.current = true;
      setVisible(true);
    }
  }, [data]);

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
  const close = () => setVisible(false);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <Pressable
        onPress={close}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.xl,
            padding: spacing.xl,
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.title, { color: colors.textPrimary }]}>Défi de la semaine</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Toute la famille cumule des Dones ensemble
              </Text>
            </View>
            <Pressable onPress={close}>
              <Ionicons name="close" size={26} color={colors.textSecondary} />
            </Pressable>
          </View>

          {data.bonus_paid ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: 22 }}>🎉</Text>
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
                Objectif atteint — +{data.bonus_amount} Dones pour tout le monde !
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.xs }}>
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

          <Pressable onPress={close} style={{ alignSelf: 'flex-end', marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Fermer</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
