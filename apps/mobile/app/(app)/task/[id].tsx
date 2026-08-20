import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { PopupScreen } from '@/components/features/PopupScreen';
import { Button } from '@/components/ui/Button';
import { Badge, PointsPill } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { DueCountdown } from '@/components/ui/DueCountdown';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/providers/AuthProvider';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useCircleMembers, useGuardianRelationships } from '@/hooks/useMembers';
import { useCancelTask, useCompleteTask, useTask, useTaskCompletions, useValidateTaskCompletion } from '@/hooks/useTasks';

const STATUS_LABELS: Record<string, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  pending_validation: 'En attente de validation',
  completed: 'Terminée',
  cancelled: 'Annulée',
  archived: 'Archivée',
};

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const { session } = useAuth();
  const { circle, myMembership } = useActiveCircle();
  const { data: task, isLoading } = useTask(id ?? null);
  const { data: members } = useCircleMembers(circle?.id ?? null);
  const { data: guardianRelationships } = useGuardianRelationships(circle?.id ?? null);
  const { data: completions } = useTaskCompletions(id ?? null);
  const completeTask = useCompleteTask(circle?.id ?? '');
  const validateCompletion = useValidateTaskCompletion(circle?.id ?? '');
  const cancelTask = useCancelTask(circle?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [performerId, setPerformerId] = useState<string | null>(null);
  const [sharedWithIds, setSharedWithIds] = useState<string[]>([]);

  const assignee = members?.find((m) => m.id === task?.assigned_to_member_id);
  const creator = members?.find((m) => m.id === task?.created_by_member_id);

  // Members the current viewer is allowed to record a completion for — the
  // "réalisée par" field is only ever a proposal at creation time; whoever
  // actually did it can differ, and this is who ends up credited.
  const manageableMembers = useMemo(() => {
    if (!myMembership || !members) return [];
    return members.filter(
      (m) =>
        m.id === myMembership.id ||
        myMembership.role === 'owner' ||
        myMembership.role === 'admin' ||
        (guardianRelationships ?? []).some((g) => g.guardian_member_id === myMembership.id && g.managed_member_id === m.id)
    );
  }, [members, myMembership, guardianRelationships]);

  useEffect(() => {
    if (!task) return;
    const preferred = manageableMembers.some((m) => m.id === task.assigned_to_member_id)
      ? task.assigned_to_member_id
      : manageableMembers[0]?.id ?? null;
    setPerformerId(preferred);
  }, [task, manageableMembers]);

  const iManageAssignee = manageableMembers.length > 0;

  const iCanValidate = useMemo(() => {
    if (!task || !myMembership) return false;
    if (myMembership.role === 'owner' || myMembership.role === 'admin') return true;
    if (task.created_by_user_id === session?.user.id) return true;
    return (guardianRelationships ?? []).some(
      (g) => g.guardian_member_id === myMembership.id && g.managed_member_id === task.assigned_to_member_id && g.can_validate_tasks
    );
  }, [task, myMembership, guardianRelationships, session]);

  const pendingCompletion = completions?.find((c) => c.status === 'pending_validation');
  const canCancel = task && myMembership && (task.created_by_member_id === myMembership.id || myMembership.role === 'owner' || myMembership.role === 'admin');

  if (isLoading || !task) return <LoadingState />;

  const onComplete = async () => {
    if (!performerId) return;
    setBusy(true);
    try {
      await completeTask.mutateAsync({
        taskId: task.id,
        performedByMemberId: performerId,
        sharedWithMemberIds: sharedWithIds.length > 0 ? sharedWithIds : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const onValidate = async (approve: boolean) => {
    if (!pendingCompletion || busy) return;
    setBusy(true);
    try {
      await validateCompletion.mutateAsync({ completionId: pendingCompletion.id, approve });
    } catch (err) {
      if (!(err instanceof Error && err.message === 'completion_not_pending')) {
        Alert.alert('Erreur', err instanceof Error ? err.message : 'Une erreur est survenue.');
      }
    } finally {
      setBusy(false);
    }
  };

  const performer = members?.find((m) => m.id === performerId);
  const showPerformerPicker =
    (task.status === 'todo' || task.status === 'in_progress') && iManageAssignee && manageableMembers.length > 1;

  // Sharing only makes sense for an orphan task — a project task's points
  // go to the project's pool as one lump no matter who completed it.
  const showHelperPicker =
    !task.project_id && (task.status === 'todo' || task.status === 'in_progress') && iManageAssignee;
  const helperCandidates = (members ?? []).filter((m) => m.id !== performerId);
  const toggleHelper = (memberId: string) => {
    setSharedWithIds((ids) => (ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId]));
  };

  return (
    <PopupScreen title={task.title}>
        <View style={{ gap: spacing.sm }}>
          <Badge label={STATUS_LABELS[task.status] ?? task.status} tone={task.status === 'completed' ? 'success' : 'neutral'} />
          {task.description ? (
            <Text style={[typography.body, { color: colors.textSecondary }]}>{task.description}</Text>
          ) : null}
        </View>

        <Card>
          <View style={{ gap: spacing.md }}>
            {assignee ? (
              <Row label="Assigné à">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Avatar name={assignee.first_name} uri={assignee.avatar_url} size={28} />
                  <Text style={[typography.body, { color: colors.textPrimary }]}>{assignee.first_name}</Text>
                </View>
              </Row>
            ) : null}
            <Row label="Dones">
              <PointsPill points={task.points} />
            </Row>
            {task.due_date ? (
              <Row label="Deadline">
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[typography.body, { color: colors.textPrimary }]}>
                    {new Date(task.due_date).toLocaleString()}
                  </Text>
                  {task.status !== 'completed' && task.status !== 'cancelled' ? (
                    <DueCountdown dueDate={task.due_date} />
                  ) : null}
                </View>
              </Row>
            ) : null}
            {creator ? (
              <Row label="Créée par">
                <Text style={[typography.body, { color: colors.textPrimary }]}>{creator.first_name}</Text>
              </Row>
            ) : null}
          </View>
        </Card>

        {task.due_date &&
        task.status !== 'completed' &&
        task.status !== 'cancelled' &&
        new Date(task.due_date).getTime() < Date.now() ? (
          <Text style={[typography.caption, { color: colors.danger }]}>
            Cette tâche est en retard : -2 Dones par jour de retard seront déduits du portefeuille personnel dès
            qu'elle sera validée.
          </Text>
        ) : null}

        {task.status === 'pending_validation' && pendingCompletion && iCanValidate ? (
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.heading, { color: colors.textPrimary }]}>
              {members?.find((m) => m.id === pendingCompletion.performed_by_member_id)?.first_name} a terminé cette tâche
            </Text>
            {pendingCompletion.shared_with_member_ids && pendingCompletion.shared_with_member_ids.length > 0 ? (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Avec l&apos;aide de{' '}
                {pendingCompletion.shared_with_member_ids
                  .map((mid) => members?.find((m) => m.id === mid)?.first_name)
                  .filter(Boolean)
                  .join(', ')}
                {' '}— les Dones seront partagés.
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button label="Valider" onPress={() => onValidate(true)} loading={busy} style={{ flex: 1 }} />
              <Button label="Refuser" onPress={() => onValidate(false)} loading={busy} variant="danger" style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}

        {(task.status === 'todo' || task.status === 'in_progress') && iManageAssignee ? (
          <View style={{ gap: spacing.md }}>
            {showPerformerPicker ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Qui l&apos;a réalisée ?</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {manageableMembers.map((m) => {
                    const selected = m.id === performerId;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => setPerformerId(m.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.xs,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                          borderRadius: radius.full,
                          backgroundColor: selected ? colors.primaryMuted : colors.surfaceMuted,
                        }}
                      >
                        <Avatar name={m.first_name} uri={m.avatar_url} size={20} />
                        <Text style={{ color: selected ? colors.primary : colors.textPrimary }}>{m.first_name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
            {showHelperPicker && helperCandidates.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Quelqu&apos;un t&apos;a aidé ?</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {helperCandidates.map((m) => {
                    const selected = sharedWithIds.includes(m.id);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => toggleHelper(m.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.xs,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                          borderRadius: radius.full,
                          backgroundColor: selected ? colors.primaryMuted : colors.surfaceMuted,
                        }}
                      >
                        <Avatar name={m.first_name} uri={m.avatar_url} size={20} />
                        <Text style={{ color: selected ? colors.primary : colors.textPrimary }}>{m.first_name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {sharedWithIds.length > 0 ? (
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Les {task.points} Dones seront partagés entre {sharedWithIds.length + 1} personnes.
                  </Text>
                ) : null}
              </View>
            ) : null}
            <Button
              label={performerId === myMembership?.id ? "J'ai terminé" : `${performer?.first_name ?? ''} a terminé`.trim()}
              onPress={onComplete}
              loading={busy}
              disabled={!performerId}
              size="lg"
            />
          </View>
        ) : null}

        {canCancel && task.status !== 'completed' && task.status !== 'cancelled' ? (
          <Button
            label="Annuler la tâche"
            variant="ghost"
            onPress={async () => {
              await cancelTask.mutateAsync(task.id);
              router.back();
            }}
          />
        ) : null}
    </PopupScreen>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={[typography.body, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}
