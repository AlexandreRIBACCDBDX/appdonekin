import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const { colors, spacing, typography } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    setSent(true);
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xxl }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Mot de passe oublié</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            On t'enverra un lien pour le réinitialiser.
          </Text>
        </View>

        {sent ? (
          <Text style={[typography.body, { color: colors.success }]}>Email envoyé à {email} !</Text>
        ) : (
          <>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="toi@exemple.com"
            />
            <Button label="Envoyer le lien" onPress={onSubmit} loading={loading} disabled={!email} size="lg" />
          </>
        )}

        <Link href="/(auth)/login" style={{ alignSelf: 'center' }}>
          <Text style={{ color: colors.primary }}>Retour à la connexion</Text>
        </Link>
      </View>
    </Screen>
  );
}
