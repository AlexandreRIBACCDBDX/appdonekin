import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { TopChrome } from '@/components/features/TopChrome';
import { BottomNav } from '@/components/features/BottomNav';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/Card';
import { PointsPill } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { DueCountdown } from '@/components/ui/DueCountdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useCircleMembers } from '@/hooks/useMembers';
import { useTasks } from '@/hooks/useTasks';
import type { Task } from '@/types/database';

const FILTERS = [
  { key: 'open', label: 'À faire', statuses: ['todo', 'in_progress'] },
  { key: 'pending', label: 'En attente', statuses: ['pending_validation'] },
  { key: 'done', label: 'Terminées', statuses: ['completed'] },
] as const;

export default function TasksScreen() {
  const { colors, spacing, radius, typography, gradients } = useTheme();
  const { circle } = useActiveCircle();
  const { data: tasks, isLoading } = useTasks(circle?.id ?? null);
  const { data: members } = useCircleMembers(circle?.id ?? null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('open');

  const filtered = useMemo(() => {
    const statuses = FILTERS.find((f) => f.key === filter)?.statuses ?? [];
    return (tasks ?? []).filter((t) => statuses.includes(t.status as never));
  }, [tasks, filter]);

  const memberFor = (task: Task) => members?.find((m) => m.id === task.assigned_to_member_id);

  if (isLoading) return <LoadingState />;

  return (
    <Screen padded={false}>
      <TopChrome variant="circle" title="Tâches" />
      <View style={{ padding: spacing.xl, gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {FILTERS.map((f) => {
            const selected = f.key === filter;
            const chip = (
              <Text style={{ color: selected ? colors.textOnPrimary : colors.textSecondary, fontWeight: '700' }}>
                {f.label}
              </Text>
            );
            return (
              <Pressable key={f.key} onPress={() => setFilter(f.key)} style={{ borderRadius: radius.full, overflow: 'hidden' }}>
                {selected ? (
                  <LinearGradient
                    colors={gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.lg }}
                  >
                    {chip}
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.lg,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    }}
                  >
                    {chip}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.huge, gap: spacing.sm }}
        ListEmptyComponent={<EmptyState emoji="✅" title="Rien ici" description="Ajoute une tâche avec le bouton +" />}
        renderItem={({ item }) => {
          const member = memberFor(item);
          const done = item.status === 'completed';
          return (
            <Card onPress={() => router.push({ pathname: '/(app)/task/[id]', params: { id: item.id } })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? colors.primary : 'transparent',
                    borderWidth: done ? 0 : 2,
                    borderColor: colors.border,
                  }}
                >
                  {done ? <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} /> : null}
                </View>
                {member ? <Avatar name={member.first_name} uri={member.avatar_url} size={36} /> : null}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={[
                      typography.bodyLarge,
                      { color: done ? colors.textMuted : colors.textPrimary, textDecorationLine: done ? 'line-through' : 'none' },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {member ? (
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{member.first_name}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                  <PointsPill points={item.points} />
                  {item.due_date && !done && item.status !== 'cancelled' ? (
                    <DueCountdown dueDate={item.due_date} />
                  ) : null}
                </View>
              </View>
            </Card>
          );
        }}
      />
      <BottomNav active="tasks" />
    </Screen>
  );
}
