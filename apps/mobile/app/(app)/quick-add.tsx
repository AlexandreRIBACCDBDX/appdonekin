import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PopupScreen } from '@/components/features/PopupScreen';
import { useTheme } from '@/hooks/useTheme';

const OPTIONS = [
  { key: 'task', label: 'Une tâche', description: 'Assigne quelque chose à faire', icon: 'checkmark-circle-outline', href: '/(app)/task/create' },
  { key: 'project', label: 'Un projet', description: 'Organise plusieurs tâches ensemble', icon: 'folder-outline', href: '/(app)/project/create' },
  { key: 'reward', label: 'Une récompense', description: "Ajoute quelque chose à débloquer avec des Dones", icon: 'gift-outline', href: '/(app)/rewards/create' },
] as const;

export default function QuickAddScreen() {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <PopupScreen title="Créer">
      <View style={{ gap: spacing.md }}>
        {OPTIONS.map((option) => (
          <Pressable
            key={option.key}
            onPress={() => {
              router.back();
              router.push(option.href as never);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.lg,
              padding: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: colors.surfaceMuted,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.md,
                backgroundColor: colors.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={option.icon} size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.heading, { color: colors.textPrimary }]}>{option.label}</Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>{option.description}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </PopupScreen>
  );
}
