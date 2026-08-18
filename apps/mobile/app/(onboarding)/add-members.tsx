import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddMemberForm } from '@/components/features/AddMemberForm';
import { MemberRow } from '@/components/features/MemberRow';
import { useTheme } from '@/hooks/useTheme';
import { useCircleMembers } from '@/hooks/useMembers';

export default function AddMembersScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const { colors, spacing, typography } = useTheme();
  const { data: members } = useCircleMembers(circleId ?? null);
  const [showForm, setShowForm] = useState(true);

  const onFinish = () => {
    router.replace('/(app)/(tabs)');
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xxl }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Qui fait partie du cercle ?</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Ajoute les autres membres — tu pourras en ajouter d'autres plus tard.
          </Text>
        </View>

        {members && members.length > 1 ? (
          <View style={{ gap: spacing.md }}>
            {members
              .filter((m) => m.role !== 'owner')
              .map((member) => (
                <Card key={member.id}>
                  <MemberRow member={member} />
                </Card>
              ))}
          </View>
        ) : (
          <EmptyState emoji="👪" title="Personne d'autre pour l'instant" description="Ajoute un premier membre ci-dessous." />
        )}

        {circleId && showForm ? (
          <Card>
            <AddMemberForm circleId={circleId} onDone={() => setShowForm(true)} />
          </Card>
        ) : null}

        <Button label="Terminer" onPress={onFinish} size="lg" />
      </View>
    </Screen>
  );
}
