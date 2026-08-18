import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const { colors, spacing, typography } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (password.length < 8) {
      setError('8 caractères minimum.');
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setNeedsEmailConfirmation(true);
      return;
    }
    router.replace('/');
  };

  if (needsEmailConfirmation) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Text style={{ fontSize: 40 }}>📬</Text>
          <Text style={[typography.heading, { color: colors.textPrimary, textAlign: 'center' }]}>
            Vérifie ta boîte mail
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            On t'a envoyé un lien de confirmation à {email}.
          </Text>
          <Link href="/(auth)/login">
            <Text style={{ color: colors.primary }}>Retour à la connexion</Text>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xxl }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Créer ton compte</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Quelques secondes suffisent pour commencer.
          </Text>
        </View>

        <View style={{ gap: spacing.lg }}>
          <TextField label="Prénom" value={fullName} onChangeText={setFullName} placeholder="Paul" />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="toi@exemple.com"
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
            placeholder="8 caractères minimum"
            error={error}
          />
        </View>

        <Button
          label="Créer mon compte"
          onPress={onSubmit}
          loading={loading}
          disabled={!fullName || !email || !password}
          size="lg"
        />

        <Link href="/(auth)/login" style={{ alignSelf: 'center' }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Déjà un compte ? <Text style={{ color: colors.primary }}>Se connecter</Text>
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
