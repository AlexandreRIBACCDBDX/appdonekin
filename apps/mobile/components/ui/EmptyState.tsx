import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ emoji = '✨', title, description, action }: EmptyStateProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { paddingVertical: spacing.huge, gap: spacing.sm }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[typography.heading, { color: colors.textPrimary, textAlign: 'center' }]}>{title}</Text>
      {description ? (
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{description}</Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 40 },
});
