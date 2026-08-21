import { appColors, gradients, radius, shadow, spacing, typography } from '@/constants/theme';

// One deliberate light, gradient-accented look ("Ciel & Lavande") — no dark
// counterpart, so this doesn't branch on the system color scheme.
export function useTheme() {
  return { colors: appColors, spacing, radius, typography, shadow, gradients, scheme: 'light' as const };
}
