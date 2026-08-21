import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { TopChrome } from '@/components/features/TopChrome';
import { BottomNav } from '@/components/features/BottomNav';
import { ManagedChildrenBalances } from '@/components/features/ManagedChildrenBalances';
import { WeeklyLeaderboard } from '@/components/features/WeeklyLeaderboard';
import { WeeklyChallengeCard } from '@/components/features/WeeklyChallengeCard';
import { Card } from '@/components/ui/Card';
import { PointsPill } from '@/components/ui/Badge';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { DueCountdown } from '@/components/ui/DueCountdown';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTasks, usePendingValidations } from '@/hooks/useTasks';
import { useProjects, useProjectTasks, useProjectWallet } from '@/hooks/useProjects';
import { projectProgress } from '@/services/projects';
import type { Project } from '@/types/database';

export default function DashboardScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { circle, myMembership, isLoading } = useActiveCircle();
  const queryClient = useQueryClient();

  const circleId = circle?.id ?? null;
  const { data: tasks, isFetching: tasksFetching } = useTasks(circleId);
  const { data: pendingValidations } = usePendingValidations(circleId);
  const { data: projects } = useProjects(circleId);

  const myTasks = useMemo(
    () =>
      (tasks ?? []).filter(
        (t) => t.assigned_to_member_id === myMembership?.id && t.status !== 'completed' && t.status !== 'cancelled'
      ),
    [tasks, myMembership]
  );

  if (isLoading || !circle) return <LoadingState />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <TopChrome variant="greeting" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xxl, paddingBottom: spacing.huge }}
        refreshControl={
          <RefreshControl
            refreshing={tasksFetching}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['circles', circle.id] })}
          />
        }
      >
        <ManagedChildrenBalances />

        {pendingValidations && pendingValidations.length > 0 ? (
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/tasks')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.primaryMuted,
              borderRadius: radius.lg,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
            }}
          >
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              {pendingValidations.length} tâche{pendingValidations.length !== 1 ? 's' : ''} en attente de validation
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}

        <WeeklyChallengeCard />

        <WeeklyLeaderboard />

      <Section
        title="Mes tâches"
        onSeeAll={() => router.push('/(app)/(tabs)/tasks')}
        empty={myTasks.length === 0}
        emptyLabel="Aucune tâche en cours, profite-en 🎉"
      >
        {myTasks.slice(0, 4).map((task) => (
          <Card key={task.id} onPress={() => router.push({ pathname: '/(app)/task/[id]', params: { id: task.id } })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[typography.bodyLarge, { color: colors.textPrimary, flex: 1 }]}>{task.title}</Text>
              <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                <PointsPill points={task.points} />
                {task.due_date ? <DueCountdown dueDate={task.due_date} /> : null}
              </View>
            </View>
          </Card>
        ))}
      </Section>

      {projects && projects.length > 0 ? (
        <Section title="Projets actifs" onSeeAll={() => router.push('/(app)/(tabs)/projects')}>
          {projects.slice(0, 3).map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </Section>
      ) : null}
      </ScrollView>
      <BottomNav active="home" />
    </SafeAreaView>
  );
}

function Section({
  title,
  onSeeAll,
  children,
  empty,
  emptyLabel,
}: {
  title: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
  empty?: boolean;
  emptyLabel?: string;
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.heading, { color: colors.textPrimary }]}>{title}</Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll}>
            <Text style={[typography.body, { color: colors.primary }]}>Voir tout</Text>
          </Pressable>
        ) : null}
      </View>
      {empty ? (
        <Text style={[typography.body, { color: colors.textMuted }]}>{emptyLabel}</Text>
      ) : (
        <View style={{ gap: spacing.sm }}>{children}</View>
      )}
    </View>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const { colors, spacing, radius, typography, gradients } = useTheme();
  const { data: tasks } = useProjectTasks(project.id);
  const { data: wallet } = useProjectWallet(project.id);
  const { percent, donesDone, donesTotal } = projectProgress(tasks ?? [], {
    targetPoints: project.target_points,
    walletBalance: wallet?.balance,
  });

  return (
    <Card onPress={() => router.push({ pathname: '/(app)/project/[id]', params: { id: project.id } })}>
      <Text style={[typography.bodyLarge, { color: colors.textPrimary }]}>{project.title}</Text>
      <View
        style={{
          height: 6,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceMuted,
          marginTop: spacing.sm,
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs }}>
        <DonesAmount
          value={`${donesDone} / ${donesTotal}`}
          size={13}
          gap={4}
          textStyle={[typography.caption, { color: colors.textSecondary }]}
        />
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{percent}%</Text>
      </View>
    </Card>
  );
}
