import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { useAcceptInvitation } from '@/hooks/useInvitations';

export default function JoinCircleScreen() {
  const { colors, spacing, typography } = useTheme();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const acceptInvitation = useAcceptInvitation();

  const onSubmit = async () => {
    setError(null);
    try {
      await acceptInvitation.mutateAsync(token.trim());
      router.replace('/(app)/(tabs)');
    } catch (err) {
      setError("Ce code d'invitation n'est pas valide ou a expiré.");
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xxl }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Rejoindre un cercle</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Colle le code ou le lien d'invitation que tu as reçu.
          </Text>
        </View>

        <TextField
          label="Code d'invitation"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          placeholder="Ex : 4f2a9c..."
          error={error}
        />

        <Button label="Rejoindre" onPress={onSubmit} loading={acceptInvitation.isPending} disabled={!token.trim()} size="lg" />
      </View>
    </Screen>
  );
}
