import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PopupScreen } from '@/components/features/PopupScreen';
import { Card } from '@/components/ui/Card';
import { PointsPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { usePointHistory } from '@/hooks/useWallet';
import type { PointTransactionType } from '@/types/database';

const TYPE_LABELS: Record<PointTransactionType, string> = {
  task_reward: 'Tâche terminée',
  reward_purchase: 'Récompense utilisée',
  transfer_sent: 'Dones envoyés',
  transfer_received: 'Dones reçus',
  manual_adjustment: 'Ajustement',
  project_contribution: 'Contribution projet',
  bonus: 'Bonus',
  refund: 'Remboursement',
  admin_adjustment: 'Ajustement DoneKin',
  late_penalty: 'Pénalité de retard',
  project_payment: 'Investi dans un projet',
};

export default function WalletHistoryScreen() {
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const { colors, spacing, typography } = useTheme();
  const { myMembership } = useActiveCircle();
  const targetMemberId = memberId ?? myMembership?.id ?? null;
  const { data: history, isLoading } = usePointHistory(targetMemberId);

  if (isLoading) return <LoadingState />;

  return (
    <PopupScreen title="Historique">
      {(history ?? []).length === 0 ? (
        <EmptyState emoji="📜" title="Aucune transaction" />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {(history ?? []).map((item) => (
            <Card key={item.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ gap: 2 }}>
                  <Text style={[typography.body, { color: colors.textPrimary }]}>{TYPE_LABELS[item.type]}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {new Date(item.created_at).toLocaleDateString()} à{' '}
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <PointsPill points={item.amount} />
              </View>
            </Card>
          ))}
        </View>
      )}
    </PopupScreen>
  );
}
