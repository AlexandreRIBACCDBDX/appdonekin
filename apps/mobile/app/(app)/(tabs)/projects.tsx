import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { TopChrome } from '@/components/features/TopChrome';
import { BottomNav } from '@/components/features/BottomNav';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { PointsPill } from '@/components/ui/Badge';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useCircleMembers } from '@/hooks/useMembers';
import { useProjects, useProjectTasks, useProjectWallet } from '@/hooks/useProjects';
import { projectProgress } from '@/services/projects';
import type { Project } from '@/types/database';

export default function ProjectsScreen() {
  const { spacing } = useTheme();
  const { circle } = useActiveCircle();
  const { data: projects, isLoading } = useProjects(circle?.id ?? null);
  const { data: members } = useCircleMembers(circle?.id ?? null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;

  return (
    <Screen padded={false}>
      <TopChrome variant="circle" title="Projets" />
      <FlatList
        data={projects ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.sm }}
        ListEmptyComponent={
          <EmptyState emoji="🗂️" title="Aucun projet" description="Crée un projet avec le bouton +" />
        }
        renderItem={({ item }) => (
          <ProjectAccordionRow
            project={item}
            members={members ?? []}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          />
        )}
      />
      <BottomNav active="projects" />
    </Screen>
  );
}

function ProjectAccordionRow({
  project,
  members,
  expanded,
  onToggle,
}: {
  project: Project;
  members: { id: string; first_name: string; avatar_url: string | null }[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colors, spacing, radius, typography, gradients } = useTheme();
  const { data: tasks } = useProjectTasks(project.id);
  const { data: wallet } = useProjectWallet(project.id);
  const { done, total, percent, donesDone, donesTotal } = projectProgress(tasks ?? [], {
    targetPoints: project.target_points,
    walletBalance: wallet?.balance,
  });

  const assignees = Array.from(new Set((tasks ?? []).map((t) => t.assigned_to_member_id).filter(Boolean)))
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is (typeof members)[number] => !!m);

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <Pressable onPress={onToggle} style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="folder" size={20} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[typography.bodyLarge, { color: colors.textPrimary }]}>{project.title}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {done} / {total} tâches
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ backgroundColor: colors.primaryMuted, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
              <Text style={{ color: colors.primary, fontSize: 11.5, fontWeight: '700' }}>{percent} %</Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={expanded ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        <View
          style={{
            height: 7,
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
          <View style={{ flexDirection: 'row' }}>
            {assignees.map((member, i) => (
              <View key={member.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                <Avatar name={member.first_name} uri={member.avatar_url} size={26} ringColor={colors.surface} />
              </View>
            ))}
          </View>
          <DonesAmount
            value={`${donesDone} / ${donesTotal}`}
            size={14}
            gap={5}
            textStyle={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm }}>
          {(tasks ?? []).length === 0 ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>Aucune tâche pour l&apos;instant.</Text>
          ) : (
            (tasks ?? []).map((task) => {
              const assignee = members.find((m) => m.id === task.assigned_to_member_id);
              const taskDone = task.status === 'completed';
              return (
                <Pressable
                  key={task.id}
                  onPress={() => router.push({ pathname: '/(app)/task/[id]', params: { id: task.id } })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                  <Ionicons
                    name={taskDone ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={taskDone ? colors.success : colors.textMuted}
                  />
                  <Text
                    style={[
                      typography.body,
                      {
                        flex: 1,
                        color: taskDone ? colors.textMuted : colors.textPrimary,
                        textDecorationLine: taskDone ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {task.title}
                  </Text>
                  {assignee ? <Avatar name={assignee.first_name} uri={assignee.avatar_url} size={22} /> : null}
                  <PointsPill points={task.points} />
                </Pressable>
              );
            })
          )}

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
            <Pressable onPress={() => router.push({ pathname: '/(app)/task/create', params: { projectId: project.id } })}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>+ Ajouter une tâche</Text>
            </Pressable>
            <Text style={{ color: colors.border }}>·</Text>
            <Pressable onPress={() => router.push({ pathname: '/(app)/project/[id]', params: { id: project.id } })}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Voir le détail</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Card>
  );
}
