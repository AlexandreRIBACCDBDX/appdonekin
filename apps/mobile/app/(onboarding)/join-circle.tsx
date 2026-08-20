import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { useAcceptInvitation, useJoinCircleByCode } from '@/hooks/useInvitations';

export default function JoinCircleScreen() {
  const { colors, spacing, typography } = useTheme();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const acceptInvitation = useAcceptInvitation();
  const joinByCode = useJoinCircleByCode();

  // One field handles both: DoneKin's short permanent circle code (e.g.
  // "8Q2-K7M4") and the older long, single-use invitation token/link. Try
  // the short code first — it's the common case — and fall back to the
  // token only if that specific code doesn't exist, so a genuinely invalid
  // token still surfaces its own error instead of always saying "invalid
  // code".
  const onSubmit = async () => {
    setError(null);
    const value = token.trim();
    try {
      await joinByCode.mutateAsync(value);
      router.replace('/(app)/(tabs)');
    } catch (codeErr) {
      if (codeErr instanceof Error && codeErr.message.includes('invalid_code')) {
        try {
          await acceptInvitation.mutateAsync(value);
          router.replace('/(app)/(tabs)');
          return;
        } catch {
          // fall through to the shared error message below
        }
      }
      setError("Ce code ou lien d'invitation n'est pas valide ou a expiré.");
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
          placeholder="Ex : 8Q2-K7M4"
          error={error}
        />

        <Button
          label="Rejoindre"
          onPress={onSubmit}
          loading={joinByCode.isPending || acceptInvitation.isPending}
          disabled={!token.trim()}
          size="lg"
        />
      </View>
    </Screen>
  );
}
