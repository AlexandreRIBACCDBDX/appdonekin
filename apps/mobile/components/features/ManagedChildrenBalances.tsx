import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useCircleMembers, useGuardianRelationships } from '@/hooks/useMembers';
import { useWallet } from '@/hooks/useWallet';
import type { CircleMember } from '@/types/database';

// The connected parent's own balance is already in TopChrome — this is only
// for the phone-less, guardian-managed members THEY manage, so a parent can
// see their kids' Dones at a glance without opening each profile.
export function ManagedChildrenBalances() {
  const { circle, myMembership } = useActiveCircle();
  const { data: members } = useCircleMembers(circle?.id ?? null);
  const { data: guardianRelationships } = useGuardianRelationships(circle?.id ?? null);

  const managedChildren = (guardianRelationships ?? [])
    .filter((g) => g.guardian_member_id === myMembership?.id)
    .map((g) => members?.find((m) => m.id === g.managed_member_id && m.access_mode === 'guardian_managed'))
    .filter((m): m is CircleMember => !!m);

  if (managedChildren.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {managedChildren.map((child) => (
        <ChildBalanceChip key={child.id} child={child} />
      ))}
    </View>
  );
}

function ChildBalanceChip({ child }: { child: CircleMember }) {
  const { colors, spacing, radius, typography } = useTheme();
  const { data: wallet } = useWallet(child.id);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/circle/member/[id]', params: { id: child.id } })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.full,
        paddingVertical: 6,
        paddingHorizontal: 12,
      }}
    >
      <Avatar name={child.first_name} uri={child.avatar_url} size={22} />
      <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>{child.first_name}</Text>
      <DonesAmount
        value={wallet?.balance ?? 0}
        size={13}
        gap={4}
        textStyle={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}
      />
    </Pressable>
  );
}
