import { Text, View } from 'react-native';
import { PopupScreen } from '@/components/features/PopupScreen';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useActivity } from '@/hooks/useActivity';
import { useCircleMembers } from '@/hooks/useMembers';
import { describeActivityEvent } from '@/utils/activity';

export default function ActivityScreen() {
  const { colors, spacing, typography } = useTheme();
  const { circle } = useActiveCircle();
  const { data: activity, isLoading } = useActivity(circle?.id ?? null);
  const { data: members } = useCircleMembers(circle?.id ?? null);

  if (isLoading) return <LoadingState />;

  return (
    <PopupScreen title="Activité">
      {(activity ?? []).length === 0 ? (
        <EmptyState emoji="📣" title="Aucune activité pour l'instant" />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {(activity ?? []).map((item) => (
            <Card key={item.id}>
              <Text style={[typography.body, { color: colors.textPrimary }]}>
                {describeActivityEvent(item, members ?? [])}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </PopupScreen>
  );
}
