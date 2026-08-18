import { FlatList, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
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
    <Screen padded={false}>
      <View style={{ padding: spacing.xl }}>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Activité</Text>
      </View>
      <FlatList
        data={activity ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.sm }}
        ListEmptyComponent={<EmptyState emoji="📣" title="Aucune activité pour l'instant" />}
        renderItem={({ item }) => (
          <Card>
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              {describeActivityEvent(item, members ?? [])}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}
