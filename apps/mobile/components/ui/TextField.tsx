import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

// Rectangular on purpose: a real border and sharp corners read as "you can
// edit this," distinct from the fully-rounded pills used for status/points.
export function TextField({ label, error, style, ...props }: TextFieldProps) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={[typography.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          typography.bodyLarge,
          {
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderRadius: radius.field,
            paddingHorizontal: spacing.lg,
            borderColor: error ? colors.danger : colors.border,
            borderWidth: 1.4,
          },
          style,
        ]}
        {...props}
      />
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { height: 52 },
});
