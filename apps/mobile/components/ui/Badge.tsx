import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { DonesCoinIcon } from './DonesCoinIcon';

type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'dones';

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: React.ReactNode;
}

export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const { bg, fg } = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
    primary: { bg: colors.primaryMuted, fg: colors.primary },
    success: { bg: colors.successMuted, fg: colors.success },
    danger: { bg: colors.dangerMuted, fg: colors.danger },
    dones: { bg: colors.donesMuted, fg: colors.dones },
  }[tone];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderRadius: radius.full,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          gap: 4,
        },
      ]}
    >
      {icon}
      <Text style={[typography.caption, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function PointsPill({ points }: { points: number }) {
  return (
    <Badge
      label={`${points > 0 ? '+' : ''}${points}`}
      tone="dones"
      icon={<DonesCoinIcon size={12} />}
    />
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
});
