import { darkColors, gradients, radius, shadow, spacing, typography } from '@/constants/theme';

// One deliberate dark, gradient-accented look — no light counterpart, so this
// no longer branches on the system color scheme.
export function useTheme() {
  return { colors: darkColors, spacing, radius, typography, shadow, gradients, scheme: 'dark' as const };
}
