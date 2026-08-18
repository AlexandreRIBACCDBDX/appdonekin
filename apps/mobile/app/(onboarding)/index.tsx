import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/providers/AuthProvider';

export default function OnboardingChoiceScreen() {
  const { colors, spacing, typography } = useTheme();
  const { profile } = useAuth();

  return (
    <Screen>
      <View style={styles(spacing).spacer} />
      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.title, { color: colors.textPrimary }]}>
          Bienvenue{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Pour commencer, crée ton premier cercle DoneKin ou rejoins-en un.
        </Text>
      </View>
      <View style={styles(spacing).spacer} />
      <View style={{ gap: spacing.md }}>
        <Link href="/(onboarding)/create-circle" asChild>
          <Button label="Créer ma famille" onPress={() => {}} size="lg" />
        </Link>
        <Link href="/(onboarding)/join-circle" asChild>
          <Button label="Rejoindre un cercle" onPress={() => {}} variant="ghost" size="lg" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = (spacing: Record<string, number>) => ({ spacer: { flex: 1, minHeight: spacing.xxl } });
