import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useWallet } from '@/hooks/useWallet';
import { CircleSwitcher } from '@/components/features/CircleSwitcher';
import { Avatar } from '@/components/ui/Avatar';
import { DonesCoinIcon } from '@/components/ui/DonesCoinIcon';

interface TopChromeProps {
  // Home shows a personal greeting; every other screen shows the circle name
  // (tappable — opens the circle switcher) plus its own screen title. Pass
  // `eyebrow` to override the circle-name line with a fixed string instead
  // (e.g. an unread count) — it stops being a circle-switcher tap target.
  variant?: 'greeting' | 'circle';
  title?: string;
  eyebrow?: string;
}

export function TopChrome({ variant = 'circle', title, eyebrow }: TopChromeProps) {
  const { colors, spacing, gradients } = useTheme();
  const { profile } = useAuth();
  const { myMembership } = useActiveCircle();
  const { data: wallet } = useWallet(myMembership?.id ?? null);
  const firstName = profile?.full_name?.split(' ')[0] ?? '';

  return (
    <View style={[styles.row, { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm }]}>
      <View style={styles.left}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ring}>
          <View style={[styles.ringInner, { backgroundColor: colors.background }]}>
            <Avatar name={profile?.full_name ?? '?'} uri={profile?.avatar_url} size={38} />
          </View>
        </LinearGradient>

        <View style={{ gap: 2 }}>
          {variant === 'greeting' ? (
            <>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>Bonjour,</Text>
              <Text style={{ color: colors.textPrimary, fontSize: 19, fontWeight: '700' }}>{firstName}</Text>
            </>
          ) : (
            <>
              {eyebrow ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>{eyebrow}</Text>
              ) : (
                <CircleSwitcher />
              )}
              <Text style={{ color: colors.textPrimary, fontSize: 19, fontWeight: '700' }}>{title}</Text>
            </>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => router.push('/(app)/quick-add')} style={styles.addBtn}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtnGradient}>
            <Ionicons name="add" size={20} color={colors.textOnPrimary} />
          </LinearGradient>
        </Pressable>

        <View
          style={[
            styles.pill,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: 999 },
          ]}
        >
          <DonesCoinIcon size={18} />
          <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{wallet?.balance ?? 0}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  ring: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ringInner: {
    width: 39,
    height: 39,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  addBtn: { width: 36, height: 36, borderRadius: 11, overflow: 'hidden' },
  addBtnGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
});
