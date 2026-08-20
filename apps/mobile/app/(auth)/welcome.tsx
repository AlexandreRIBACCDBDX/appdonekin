import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { LogoTile } from '@/components/ui/LogoTile';
import { useTheme } from '@/hooks/useTheme';

export default function WelcomeScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => router.push('/guide')} hitSlop={10} accessibilityLabel="Comment fonctionne DoneKin">
          <Ionicons name="information-circle-outline" size={26} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.spacer} />
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <LogoTile size={72} />
        <Text style={[typography.display, { color: colors.textPrimary }]}>DoneKin</Text>
        <Text style={[typography.bodyLarge, { color: colors.textSecondary, textAlign: 'center' }]}>
          Get things done, together.
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }]}>
          🎉 La corvée devient un jeu : défiez-vous en famille ou entre potes sur les tâches du quotidien, et
          cumulez des Dones ensemble.
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
