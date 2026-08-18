import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';

export function CircleSwitcher() {
  const { colors, spacing, radius, typography } = useTheme();
  const { circle, circles, switchCircle } = useActiveCircle();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Text style={[typography.label, { color: colors.textSecondary, fontSize: 13, fontWeight: '500' }]}>
          {circle?.name ?? '...'}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setOpen(false)}>
          <View
            style={{
              marginTop: 100,
              marginHorizontal: spacing.xl,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.sm,
              gap: 2,
            }}
          >
            {circles.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  switchCircle(c.id);
                  setOpen(false);
                }}
                style={{
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: c.id === circle?.id ? colors.primaryMuted : 'transparent',
                }}
              >
                <Text style={[typography.body, { color: colors.textPrimary }]}>{c.name}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setOpen(false);
                router.push('/(app)/circle/create');
              }}
              style={{ padding: spacing.md, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[typography.body, { color: colors.primary }]}>Nouveau cercle</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
