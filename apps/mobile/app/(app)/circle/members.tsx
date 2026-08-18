import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { MemberRow } from '@/components/features/MemberRow';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useCircleMembers, useGuardianRelationships } from '@/hooks/useMembers';
import { useCircleWallets } from '@/hooks/useWallet';

export default function CircleMembersScreen() {
  const { colors, spacing, typography } = useTheme();
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
    <Screen padded={false}>
      <View style={{ padding: spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.title, { color: colors.textPrimary }]}>{circle.name}</Text>
        <Pressable onPress={() => router.push('/(app)/circle/add-member')}>
          <Ionicons name="person-add-outline" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={members ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
        renderItem={({ item }) => (
          <Card onPress={() => router.push({ pathname: '/(app)/circle/member/[id]', params: { id: item.id } })}>
            <MemberRow
              member={item}
              points={wallets?.find((w) => w.member_id === item.id)?.balance ?? 0}
              guardianNames={guardianNamesFor(item.id)}
            />
          </Card>
        )}
      />
    </Screen>
  );
}
