import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useActivity';

type Tab = 'home' | 'tasks' | 'projects' | 'notifications' | 'profile';

const TABS: { key: Tab; href: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', href: '/(app)/(tabs)', icon: 'home' },
  { key: 'tasks', href: '/(app)/(tabs)/tasks', icon: 'checkmark-circle' },
  { key: 'projects', href: '/(app)/(tabs)/projects', icon: 'folder' },
  { key: 'notifications', href: '/(app)/notifications', icon: 'notifications' },
  { key: 'profile', href: '/(app)/(tabs)/profile', icon: 'person-circle' },
];

// Persistent bottom tab bar. Creating a task/project/reward is reached via
// the square "+" button in TopChrome, next to the Dones balance — not from
// here.
export function BottomNav({ active }: { active: Tab }) {
  const { colors, spacing, radius } = useTheme();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.read_at).length ?? 0;

  return (
    <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, backgroundColor: colors.background }}>
      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full }]}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => router.push(tab.href as never)}
              style={[styles.tabBtn, { borderRadius: radius.full, backgroundColor: isActive ? colors.surfaceMuted : 'transparent' }]}
            >
              <Ionicons name={tab.icon} size={22} color={isActive ? colors.textPrimary : colors.textMuted} />
              {tab.key === 'notifications' && unreadCount > 0 ? (
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  tabBtn: {
    width: 52,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
