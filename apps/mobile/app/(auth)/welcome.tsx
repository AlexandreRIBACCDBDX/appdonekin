import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { LogoTile } from '@/components/ui/LogoTile';
import { useTheme } from '@/hooks/useTheme';

export default function WelcomeScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <Screen>
      <View style={styles.spacer} />
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <LogoTile size={72} />
        <Text style={[typography.display, { color: colors.textPrimary }]}>DoneKin</Text>
        <Text style={[typography.bodyLarge, { color: colors.textSecondary, textAlign: 'center' }]}>
          Get things done, together.
        </Text>
      </View>
      <View style={styles.spacer} />
      <View style={{ gap: spacing.md }}>
        <Link href="/(auth)/register" asChild>
          <Button label="Créer un compte" onPress={() => {}} size="lg" />
        </Link>
        <Link href="/(auth)/login" asChild>
          <Button label="J'ai déjà un compte" onPress={() => {}} variant="ghost" size="lg" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spacer: { flex: 1 },
});
