import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PopupScreen } from '@/components/features/PopupScreen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DonesCoinIcon } from '@/components/ui/DonesCoinIcon';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useRewards } from '@/hooks/useRewards';
import { useWallet } from '@/hooks/useWallet';

export default function RewardsScreen() {
  const { colors, spacing, typography } = useTheme();
  const { circle, myMembership } = useActiveCircle();
  const { data: rewards, isLoading } = useRewards(circle?.id ?? null);
  const { data: wallet } = useWallet(myMembership?.id ?? null);

  if (isLoading) return <LoadingState />;

  return (
    <PopupScreen title="Récompenses">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Tu as</Text>
          <DonesAmount
            value={wallet?.balance ?? 0}
            size={14}
            gap={4}
            textStyle={[typography.body, { color: colors.textSecondary, fontWeight: '700' }]}
          />
        </View>
        <Pressable onPress={() => router.push('/(app)/rewards/create')}>
          <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
        </Pressable>
      </View>

      {(rewards ?? []).length === 0 ? (
        <EmptyState emoji="🎁" title="Aucune récompense" description="Ajoute-en une avec le +" />
      ) : (
        <View style={{ gap: spacing.md }}>
          {(rewards ?? []).map((item) => (
            <Card key={item.id} onPress={() => router.push({ pathname: '/(app)/rewards/[id]', params: { id: item.id } })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[typography.bodyLarge, { color: colors.textPrimary }]}>
                    {item.icon ? `${item.icon} ` : ''}
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.description}</Text>
                  ) : null}
                </View>
                <Badge label={String(item.cost_points)} tone="dones" icon={<DonesCoinIcon size={12} />} />
              </View>
            </Card>
          ))}
        </View>
      )}
    </PopupScreen>
  );
}
