import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { palette } from '@/constants/theme';

const URGENT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h${minutes.toString().padStart(2, '0')}`;
  return `${minutes}min`;
}

interface DueCountdownProps {
  dueDate: string;
}

// Live countdown badge for a task's deadline — ticks on its own so a list
// screen doesn't need a refetch just to keep "2h restant" honest. A tinted
// pill, not just a color swap, moves through three tiers: quiet lavender
// with time to spare, amber inside the last 24h, red once overdue (which is
// also when the late penalty in apply_late_penalty() starts accruing at
// -2 Dones/day).
export function DueCountdown({ dueDate }: DueCountdownProps) {
  const { spacing, radius } = useTheme();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const diff = new Date(dueDate).getTime() - now;
  const overdue = diff < 0;
  const urgent = !overdue && diff < URGENT_THRESHOLD_MS;
  const label = overdue ? `Retard ${formatDuration(-diff)}` : `${formatDuration(diff)} restant`;

  const tier = overdue
    ? { bg: palette.redMuted, fg: palette.red600, icon: 'alert-circle' as const }
    : urgent
      ? { bg: palette.goldMuted, fg: palette.gold500, icon: 'time-outline' as const }
      : { bg: palette.violetMuted, fg: palette.lavender, icon: 'time-outline' as const };

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: tier.bg, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
      ]}
    >
      <Ionicons name={tier.icon} size={12} color={tier.fg} />
      <Text style={[styles.label, { color: tier.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 12, fontWeight: '600' },
});
