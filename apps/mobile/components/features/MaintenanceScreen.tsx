import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoTile } from '@/components/ui/LogoTile';
import { useTheme } from '@/hooks/useTheme';

// Shown app-wide (before auth even resolves) when the admin back office
// flips the `maintenance_mode_enabled` feature flag on.
export function MaintenanceScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md }}>
        <LogoTile size={72} />
        <Text
          style={[typography.title, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.lg }]}
        >
          On répare la tuyauterie 🔧
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          DoneKin fait une petite sieste technique. On revient très vite, promis — c&apos;est même pas une tâche
          qu&apos;on peut se valider soi-même.
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          En attendant, la vaisselle ne va pas se faire toute seule... 👀
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.lg }]}>
          Retour très bientôt.
        </Text>
      </View>
    </SafeAreaView>
  );
}
