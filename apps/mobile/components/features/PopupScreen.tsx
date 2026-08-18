import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

interface PopupScreenProps {
  title: string;
  children: ReactNode;
}

// Centered popup for a `transparentModal` route: dimmed backdrop over the
// previous screen, tap outside (or the ×) to dismiss, scrollable body for
// forms too long to fit without scrolling.
export function PopupScreen({ title, children }: PopupScreenProps) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <Pressable
      onPress={() => router.back()}
      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}
    >
      <Pressable
        onPress={() => {}}
        style={{
          width: '100%',
          maxWidth: 460,
          maxHeight: '86%',
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.xl,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: spacing.xl,
            paddingBottom: spacing.md,
          }}
        >
          <Text style={[typography.title, { color: colors.textPrimary }]}>{title}</Text>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={26} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}
