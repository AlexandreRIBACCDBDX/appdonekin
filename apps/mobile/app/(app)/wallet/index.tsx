import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useWallet } from '@/hooks/useWallet';

export default function WalletScreen() {
  const { colors, spacing, typography } = useTheme();
  const { myMembership } = useActiveCircle();
  const { data: wallet, isLoading } = useWallet(myMembership?.id ?? null);

  if (isLoading || !myMembership) return <LoadingState />;

  return (
    <Screen>
      <View style={{ gap: spacing.xxl }}>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Mon wallet</Text>

        <Card>
          <View style={{ alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg }}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>Solde disponible</Text>
            <DonesAmount value={wallet?.balance ?? 0} size={28} gap={10} textStyle={[typography.display, { color: colors.dones }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <DonesAmount value={wallet?.total_earned ?? 0} size={14} gap={4} textStyle={[typography.heading, { color: colors.success }]} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Gagnés</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <DonesAmount value={wallet?.total_spent ?? 0} size={14} gap={4} textStyle={[typography.heading, { color: colors.textPrimary }]} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Dépensés</Text>
            </View>
          </View>
        </Card>

        <Button label="Voir l'historique" variant="secondary" onPress={() => router.push('/(app)/wallet/history')} />
        <Button label="Voir les récompenses" onPress={() => router.push('/(app)/rewards')} />
      </View>
    </Screen>
  );
}
