import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { AddMemberForm } from '@/components/features/AddMemberForm';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { LoadingState } from '@/components/ui/LoadingState';

export default function AddMemberScreen() {
  const { colors, spacing, typography } = useTheme();
  const { circle } = useActiveCircle();

  if (!circle) return <LoadingState />;

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xxl }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Ajouter un membre</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Il rejoindra {circle.name} immédiatement.
          </Text>
        </View>
        <AddMemberForm circleId={circle.id} onDone={() => router.back()} />
      </View>
    </Screen>
  );
}
