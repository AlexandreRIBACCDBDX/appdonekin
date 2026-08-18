import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useCircleMembers, useGuardianRelationships } from '@/hooks/useMembers';
import { useRewards, useRedeemReward, useRedemptions, useValidateRedemption } from '@/hooks/useRewards';
import { useWallet } from '@/hooks/useWallet';

export default function RewardDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography } = useTheme();
  const { circle, myMembership } = useActiveCircle();
  const { data: rewards, isLoading } = useRewards(circle?.id ?? null);
  const { data: members } = useCircleMembers(circle?.id ?? null);
  const { data: guardianRelationships } = useGuardianRelationships(circle?.id ?? null);
  const { data: redemptions } = useRedemptions(circle?.id ?? null);
  const redeemReward = useRedeemReward(circle?.id ?? '');
  const validateRedemption = useValidateRedemption(circle?.id ?? '');
  const { data: myWallet } = useWallet(myMembership?.id ?? null);
  const [redeemFor, setRedeemFor] = useState<string | null>(myMembership?.id ?? null);

  const reward = rewards?.find((r) => r.id === id);

  const managedMembers = useMemo(
    () =>
      (guardianRelationships ?? [])
        .filter((g) => g.guardian_member_id === myMembership?.id)
        .map((g) => members?.find((m) => m.id === g.managed_member_id))
        .filter((m): m is NonNullable<typeof m> => !!m),
    [guardianRelationships, myMembership, members]
  );

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin';
  const pendingForThisReward = (redemptions ?? []).filter((r) => r.reward_id === id && r.status === 'pending_validation');

  if (isLoading || !reward) return <LoadingState />;

  const onRedeem = async () => {
    if (!redeemFor) return;
    await redeemReward.mutateAsync({ rewardId: reward.id, memberId: redeemFor });
    router.back();
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xxl }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>
            {reward.icon ? `${reward.icon} ` : ''}
            {reward.name}
          </Text>
          {reward.description ? (
            <Text style={[typography.body, { color: colors.textSecondary }]}>{reward.description}</Text>
          ) : null}
          <DonesAmount value={reward.cost_points} size={18} textStyle={[typography.heading, { color: colors.dones }]} />
        </View>

        {managedMembers.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Pour qui ?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {[myMembership, ...managedMembers].filter(Boolean).map((m) => (
                <Pressable
                  key={m!.id}
                  onPress={() => setRedeemFor(m!.id)}
                  style={{ alignItems: 'center', gap: 4 }}
                >
                  <Avatar name={m!.first_name} size={44} ringColor={redeemFor === m!.id ? colors.primary : undefined} />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{m!.first_name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <Button
          label={reward.requires_validation ? 'Demander à utiliser' : 'Utiliser maintenant'}
          onPress={onRedeem}
          loading={redeemReward.isPending}
          disabled={!redeemFor || (redeemFor === myMembership?.id && (myWallet?.balance ?? 0) < reward.cost_points)}
          size="lg"
        />

        {isAdmin && pendingForThisReward.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.heading, { color: colors.textPrimary }]}>En attente de validation</Text>
            {pendingForThisReward.map((redemption) => {
              const requester = members?.find((m) => m.id === redemption.redeemed_by_member_id);
              return (
                <Card key={redemption.id}>
                  <Text style={[typography.body, { color: colors.textPrimary }]}>{requester?.first_name}</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                    <Button
                      label="Valider"
                      onPress={() => validateRedemption.mutate({ redemptionId: redemption.id, approve: true })}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="Refuser"
                      variant="danger"
                      onPress={() => validateRedemption.mutate({ redemptionId: redemption.id, approve: false })}
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
