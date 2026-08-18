import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const { colors, spacing, typography } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) {
      setError('Email ou mot de passe incorrect.');
      return;
    }
    router.replace('/');
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xxl }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Content de te revoir</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Connecte-toi à ton cercle DoneKin.</Text>
        </View>

        <View style={{ gap: spacing.lg }}>
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
            autoComplete="password"
            placeholder="••••••••"
            error={error}
          />
          <Link href="/(auth)/forgot-password" style={{ alignSelf: 'flex-end' }}>
            <Text style={[typography.body, { color: colors.primary }]}>Mot de passe oublié ?</Text>
          </Link>
        </View>

        <Button label="Se connecter" onPress={onSubmit} loading={loading} disabled={!email || !password} size="lg" />

        <Link href="/(auth)/register" style={{ alignSelf: 'center' }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Pas encore de compte ? <Text style={{ color: colors.primary }}>Créer un compte</Text>
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
