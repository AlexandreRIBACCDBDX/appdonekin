import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { TopChrome } from '@/components/features/TopChrome';
import { BottomNav } from '@/components/features/BottomNav';
import { Card } from '@/components/ui/Card';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/providers/AuthProvider';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useWallet } from '@/hooks/useWallet';

const LINKS = [
  { key: 'wallet', label: 'Historique du wallet', icon: 'wallet-outline', href: '/(app)/wallet/history' },
  { key: 'members', label: 'Le cercle', icon: 'people-outline', href: '/(app)/circle/members' },
  { key: 'rewards', label: 'Récompenses', icon: 'gift-outline', href: '/(app)/rewards' },
  { key: 'activity', label: 'Activité du cercle', icon: 'pulse-outline', href: '/(app)/activity' },
] as const;

export default function ProfileScreen() {
  const { colors, spacing, radius, typography, gradients } = useTheme();
  const { signOut } = useAuth();
  const { myMembership } = useActiveCircle();
  const { data: wallet } = useWallet(myMembership?.id ?? null);

  return (
    <Screen padded={false}>
      <TopChrome variant="circle" title="Mon profil" />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xxl, paddingBottom: spacing.huge }}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radius.xl, padding: spacing.xl, gap: spacing.xs }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Solde du wallet</Text>
          <DonesAmount value={wallet?.balance ?? 0} size={26} gap={10} textStyle={{ color: '#fff', fontSize: 36, fontWeight: '800' }} />
        </LinearGradient>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', gap: 4 }}>
            <DonesAmount value={wallet?.total_earned ?? 0} size={14} gap={4} textStyle={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Gagnés</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', gap: 4 }}>
            <DonesAmount value={wallet?.total_spent ?? 0} size={14} gap={4} textStyle={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Dépensés</Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          {LINKS.map((link) => (
            <Pressable
              key={link.key}
              onPress={() => router.push(link.href as never)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.lg,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceMuted,
              }}
            >
              <Ionicons name={link.icon} size={22} color={colors.textPrimary} />
              <Text style={[typography.body, { flex: 1, color: colors.textPrimary }]}>{link.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Card onPress={signOut}>
          <Text style={[typography.body, { color: colors.danger, textAlign: 'center' }]}>Se déconnecter</Text>
        </Card>
      </ScrollView>
      <BottomNav active="profile" />
    </Screen>
  );
}
