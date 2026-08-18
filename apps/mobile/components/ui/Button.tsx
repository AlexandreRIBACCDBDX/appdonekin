import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  style,
}: ButtonProps) {
  const { colors, spacing, radius, typography, gradients } = useTheme();

  const backgroundColor = {
    primary: undefined,
    secondary: colors.surfaceMuted,
    ghost: 'transparent',
    danger: colors.danger,
  }[variant];

  const textColor = variant === 'primary' || variant === 'danger' ? colors.textOnPrimary : colors.textPrimary;

  const isDisabled = disabled || loading;

  const paddingVertical = size === 'lg' ? spacing.lg : spacing.md;

  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <>
      {icon}
      <Text style={[typography.heading, { color: textColor, fontSize: 16 }]}>{label}</Text>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: radius.full,
          paddingVertical: variant === 'primary' ? 0 : paddingVertical,
          paddingHorizontal: variant === 'primary' ? 0 : spacing.xl,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border,
          backgroundColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            { borderRadius: radius.full, paddingVertical, paddingHorizontal: spacing.xl, width: '100%' },
          ]}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
  },
});
