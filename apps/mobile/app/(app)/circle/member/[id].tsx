import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import {
  useCircleMembers,
  useGuardianRelationships,
  useRemoveGuardianRelationship,
  useSetGuardianRelationship,
} from '@/hooks/useMembers';
import { useWallet } from '@/hooks/useWallet';
import { useCreateInvitation } from '@/hooks/useInvitations';

export default function MemberDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const { circle, myMembership } = useActiveCircle();
  const { data: members } = useCircleMembers(circle?.id ?? null);
  const { data: guardianRelationships } = useGuardianRelationships(circle?.id ?? null);
  const { data: wallet } = useWallet(id ?? null);
  const removeGuardian = useRemoveGuardianRelationship(circle?.id ?? '');
  const setGuardian = useSetGuardianRelationship(circle?.id ?? '');
  const createInvitation = useCreateInvitation(circle?.id ?? '');
  const [pickingGuardian, setPickingGuardian] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);

  const member = members?.find((m) => m.id === id);
  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin';

  const myGuardians = useMemo(
    () => (guardianRelationships ?? []).filter((g) => g.managed_member_id === id),
    [guardianRelationships, id]
  );
  const guardianCandidates = useMemo(
    () => (members ?? []).filter((m) => m.id !== id && !myGuardians.some((g) => g.guardian_member_id === m.id)),
    [members, id, myGuardians]
  );

  if (!member || !circle) return <LoadingState />;

  const age = member.birth_date
    ? Math.floor((Date.now() - new Date(member.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const onInvite = async () => {
    const invitation = await createInvitation.mutateAsync({ targetMemberId: member.id });
    setInvitationLink(invitation.token);
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xxl }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Avatar name={member.first_name} uri={member.avatar_url} size={80} />
          <Text style={[typography.title, { color: colors.textPrimary }]}>
            {member.first_name}
            {age !== null ? ` · ${age} ans` : ''}
          </Text>
        </View>

        <Card>
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Accès DoneKin</Text>
            {member.access_mode === 'personal_account' ? (
              <Text style={[typography.body, { color: colors.textPrimary }]}>📱 Compte personnel</Text>
            ) : (
              <View style={{ gap: spacing.xs }}>
                <Text style={[typography.body, { color: colors.textPrimary }]}>🔒 Pas de téléphone / profil géré</Text>
                {myGuardians.length > 0 ? (
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Responsables :{' '}
                    {myGuardians
                      .map((g) => members?.find((m) => m.id === g.guardian_member_id)?.first_name)
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                ) : null}
              </View>
            )}
            {member.access_mode === 'guardian_managed' && member.has_phone && isAdmin ? (
              <Button
                label={invitationLink ? 'Nouveau lien généré' : "Inviter à créer son compte"}
                variant="secondary"
                onPress={onInvite}
                loading={createInvitation.isPending}
              />
            ) : null}
            {invitationLink ? (
              <Text selectable style={[typography.caption, { color: colors.primary }]}>
                Code d'invitation : {invitationLink}
              </Text>
            ) : null}
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Wallet</Text>
              <DonesAmount value={wallet?.balance ?? 0} size={20} textStyle={[typography.title, { color: colors.dones }]} />
            </View>
            <Button label="Historique" variant="ghost" onPress={() => router.push({ pathname: '/(app)/wallet/history', params: { memberId: member.id } })} />
          </View>
        </Card>

        {member.access_mode === 'guardian_managed' && isAdmin ? (
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.heading, { color: colors.textPrimary }]}>Qui peut gérer le profil de {member.first_name} ?</Text>
            {myGuardians.map((g) => {
              const guardian = members?.find((m) => m.id === g.guardian_member_id);
              if (!guardian) return null;
              return (
                <Card key={g.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Avatar name={guardian.first_name} uri={guardian.avatar_url} size={32} />
                      <Text style={[typography.body, { color: colors.textPrimary }]}>{guardian.first_name}</Text>
                    </View>
                    <Pressable onPress={() => removeGuardian.mutate(g.id)}>
                      <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
                    </Pressable>
                  </View>
                </Card>
              );
            })}

            {pickingGuardian ? (
              <Card>
                <View style={{ gap: spacing.sm }}>
                  <Text style={[typography.label, { color: colors.textSecondary }]}>Choisir un responsable</Text>
                  {guardianCandidates.map((candidate) => (
                    <Pressable
                      key={candidate.id}
                      onPress={() => {
                        setGuardian.mutate({ guardianMemberId: candidate.id, managedMemberId: member.id });
                        setPickingGuardian(false);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}
                    >
                      <Avatar name={candidate.first_name} uri={candidate.avatar_url} size={28} />
                      <Text style={[typography.body, { color: colors.textPrimary }]}>{candidate.first_name}</Text>
                    </Pressable>
                  ))}
                </View>
              </Card>
            ) : (
              <Button label="+ Ajouter un responsable" variant="ghost" onPress={() => setPickingGuardian(true)} />
            )}
          </View>
        ) : null}

        {member.role !== 'owner' && !isAdmin ? <Badge label={member.role} /> : null}
      </View>
    </Screen>
  );
}
