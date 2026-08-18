import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, PointsPill } from '@/components/ui/Badge';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { MemberRow } from '@/components/features/MemberRow';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import {
  useAddProjectMember,
  useCastPromiseVote,
  useCompleteProject,
  useProjectMembers,
  useProjects,
  useProjectTasks,
  useProjectWallet,
  usePromiseVotes,
  useRemoveProjectMember,
} from '@/hooks/useProjects';
import { useCircleMembers } from '@/hooks/useMembers';
import { projectProgress } from '@/services/projects';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const { circle, myMembership } = useActiveCircle();
  const { data: projects } = useProjects(circle?.id ?? null);
  const { data: tasks, isLoading } = useProjectTasks(id ?? null);
  const { data: members } = useCircleMembers(circle?.id ?? null);
  const { data: projectMembers } = useProjectMembers(id ?? null);
  const { data: wallet } = useProjectWallet(id ?? null);
  const { data: promiseVotes } = usePromiseVotes(id ?? null);
  const castVote = useCastPromiseVote(id ?? '');
  const completeProject = useCompleteProject(circle?.id ?? '');
  const addProjectMember = useAddProjectMember(id ?? '');
  const removeProjectMember = useRemoveProjectMember(id ?? '');
  const [busy, setBusy] = useState(false);
  const project = projects?.find((p) => p.id === id);

  if (isLoading || !project) return <LoadingState />;

  const { done, total, percent } = projectProgress(tasks ?? [], {
    targetPoints: project.target_points,
    walletBalance: wallet?.balance,
  });

  const isCreator = project.created_by_member_id === myMembership?.id;
  const canManage = isCreator || myMembership?.role === 'owner' || myMembership?.role === 'admin';
  const isParticipant = (projectMembers ?? []).some((pm) => pm.member_id === myMembership?.id);
  const myVote = promiseVotes?.find((v) => v.member_id === myMembership?.id);
  const confirmedCount = promiseVotes?.filter((v) => v.confirmed).length ?? 0;
  const deniedCount = promiseVotes?.filter((v) => !v.confirmed).length ?? 0;

  const poolBalance = wallet?.balance ?? 0;
  const targetPoints = project.target_points;
  const targetReached = targetPoints == null || poolBalance >= targetPoints;
  const targetPercent = targetPoints ? Math.min(100, Math.round((poolBalance / targetPoints) * 100)) : 0;

  const participantMembers = (projectMembers ?? [])
    .map((pm) => members?.find((m) => m.id === pm.member_id))
    .filter((m): m is NonNullable<typeof m> => !!m);
  const availableMembers = (members ?? []).filter(
    (m) => !(projectMembers ?? []).some((pm) => pm.member_id === m.id)
  );

  const onVote = async (confirmed: boolean) => {
    await castVote.mutateAsync(confirmed);
  };

  const onComplete = () => {
    Alert.alert('Terminer le projet ?', 'Chaque participant recevra +5 Dones. Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Terminer',
        onPress: async () => {
          setBusy(true);
          try {
            const result = await completeProject.mutateAsync(project.id);
            Alert.alert(
              'Projet terminé 🎉',
              `+5 Dones pour chaque participant.${result.promise_kept ? ' La promesse a été confirmée : +10 Dones pour le créateur.' : ''}`
            );
          } catch (err) {
            const message = err instanceof Error && err.message === 'target_not_reached'
              ? "L'objectif de Dones du projet n'est pas encore atteint."
              : "Une erreur est survenue.";
            Alert.alert('Impossible de terminer le projet', message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xxl }}>
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={[typography.title, { color: colors.textPrimary }]}>{project.title}</Text>
            {project.status === 'completed' ? <Badge label="Terminé" tone="success" /> : null}
          </View>
          {project.description ? (
            <Text style={[typography.body, { color: colors.textSecondary }]}>{project.description}</Text>
          ) : null}
        </View>

        <Card>
          <View
            style={{
              height: 8,
              borderRadius: radius.full,
              backgroundColor: colors.surfaceMuted,
              overflow: 'hidden',
            }}
          >
            <View style={{ width: `${percent}%`, height: '100%', backgroundColor: colors.primary }} />
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            {done} tâches terminées / {total} • {percent}%
          </Text>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>Dones du projet</Text>
            <DonesAmount
              value={`${poolBalance}${targetPoints ? ` / ${targetPoints}` : ''}`}
              size={18}
              textStyle={[typography.heading, { color: colors.dones }]}
            />
          </View>
          {targetPoints ? (
            <>
              <View
                style={{
                  height: 8,
                  borderRadius: radius.full,
                  backgroundColor: colors.surfaceMuted,
                  overflow: 'hidden',
                  marginTop: spacing.sm,
                }}
              >
                <View
                  style={{
                    width: `${targetPercent}%`,
                    height: '100%',
                    backgroundColor: targetReached ? colors.success : colors.dones,
                  }}
                />
              </View>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
                {targetReached
                  ? 'Objectif atteint — le projet peut être clôturé.'
                  : `Encore ${targetPoints - poolBalance} Dones avant de pouvoir clôturer le projet.`}
              </Text>
            </>
          ) : null}
        </Card>

        <View style={{ gap: spacing.md }}>
          <Text style={[typography.heading, { color: colors.textPrimary }]}>Membres du projet</Text>
          {participantMembers.length === 0 ? (
            <EmptyState emoji="👥" title="Aucun membre affecté" />
          ) : (
            participantMembers.map((member) => (
              <Card key={member.id}>
                <MemberRow
                  member={member}
                  right={
                    canManage && project.status !== 'completed' && member.id !== project.created_by_member_id ? (
                      <Button
                        label="Retirer"
                        variant="ghost"
                        onPress={() => removeProjectMember.mutateAsync(member.id)}
                        loading={removeProjectMember.isPending}
                      />
                    ) : undefined
                  }
                />
              </Card>
            ))
          )}
          {canManage && project.status !== 'completed' && availableMembers.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Affecter un membre</Text>
              {availableMembers.map((member) => (
                <Card key={member.id}>
                  <MemberRow
                    member={member}
                    right={
                      <Button
                        label="Ajouter"
                        variant="ghost"
                        onPress={() => addProjectMember.mutateAsync(member.id)}
                        loading={addProjectMember.isPending}
                      />
                    }
                  />
                </Card>
              ))}
            </View>
          ) : null}
        </View>

        {project.promise_description ? (
          <Card>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Engagement du créateur</Text>
            <Text style={[typography.body, { color: colors.textPrimary, marginTop: spacing.xs }]}>
              {project.promise_description}
            </Text>
            {project.status !== 'completed' && isParticipant && !isCreator ? (
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Cet engagement a-t-il été tenu ?</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button
                    label={myVote?.confirmed === true ? '✓ Oui' : 'Oui'}
                    variant={myVote?.confirmed === true ? 'primary' : 'secondary'}
                    onPress={() => onVote(true)}
                    loading={castVote.isPending}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label={myVote?.confirmed === false ? '✓ Non' : 'Non'}
                    variant={myVote?.confirmed === false ? 'danger' : 'secondary'}
                    onPress={() => onVote(false)}
                    loading={castVote.isPending}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : isCreator ? (
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
                {confirmedCount} confirmation(s), {deniedCount} refus — tu ne peux pas voter sur ta propre promesse.
              </Text>
            ) : null}
          </Card>
        ) : null}

        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[typography.heading, { color: colors.textPrimary }]}>Tâches</Text>
            <Button
              label="+ Ajouter"
              variant="ghost"
              onPress={() => router.push({ pathname: '/(app)/task/create', params: { projectId: project.id } })}
            />
          </View>
          {(tasks ?? []).length === 0 ? (
            <EmptyState emoji="📋" title="Aucune tâche pour ce projet" />
          ) : (
            (tasks ?? []).map((task) => {
              const assignee = members?.find((m) => m.id === task.assigned_to_member_id);
              return (
                <Card key={task.id} onPress={() => router.push({ pathname: '/(app)/task/[id]', params: { id: task.id } })}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[typography.bodyLarge, { color: colors.textPrimary }]}>{task.title}</Text>
                      {assignee ? (
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>{assignee.first_name}</Text>
                      ) : null}
                    </View>
                    <PointsPill points={task.points} />
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {canManage && project.status !== 'completed' ? (
          <Button
            label="Terminer le projet"
            onPress={onComplete}
            loading={busy}
            disabled={!targetReached}
            size="lg"
          />
        ) : null}
      </View>
    </Screen>
  );
}
