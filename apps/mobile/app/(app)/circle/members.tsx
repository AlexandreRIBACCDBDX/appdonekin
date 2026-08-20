import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PopupScreen } from '@/components/features/PopupScreen';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { MemberRow } from '@/components/features/MemberRow';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useCircleMembers, useGuardianRelationships } from '@/hooks/useMembers';
import { useCircleWallets } from '@/hooks/useWallet';

export default function CircleMembersScreen() {
  const { colors, spacing } = useTheme();
  const { circle } = useActiveCircle();
  const { data: members, isLoading } = useCircleMembers(circle?.id ?? null);
  const { data: guardianRelationships } = useGuardianRelationships(circle?.id ?? null);
  const { data: wallets } = useCircleWallets(circle?.id ?? null);

  if (isLoading || !circle) return <LoadingState />;

  const guardianNamesFor = (memberId: string) =>
    (guardianRelationships ?? [])
      .filter((g) => g.managed_member_id === memberId)
      .map((g) => members?.find((m) => m.id === g.guardian_member_id)?.first_name)
      .filter((n): n is string => !!n);

  return (
    <PopupScreen title={circle.name}>
      <Pressable
        onPress={() => router.push('/(app)/circle/add-member')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-end' }}
      >
        <Ionicons name="person-add-outline" size={20} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: '600' }}>Ajouter</Text>
      </Pressable>

      <View style={{ gap: spacing.md }}>
        {(members ?? []).map((item) => (
          <Card key={item.id} onPress={() => router.push({ pathname: '/(app)/circle/member/[id]', params: { id: item.id } })}>
            <MemberRow
              member={item}
              points={wallets?.find((w) => w.member_id === item.id)?.balance ?? 0}
              guardianNames={guardianNamesFor(item.id)}
            />
          </Card>
        ))}
      </View>
    </PopupScreen>
  );
}
