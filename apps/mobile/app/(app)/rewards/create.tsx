import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useCreateReward } from '@/hooks/useRewards';

export default function CreateRewardScreen() {
  const { colors, spacing, typography } = useTheme();
  const { circle, myMembership } = useActiveCircle();
  const createReward = useCreateReward(circle?.id ?? '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [costPoints, setCostPoints] = useState('20');

  const onSubmit = async () => {
    if (!myMembership) return;
    await createReward.mutateAsync({
      createdByMemberId: myMembership.id,
      name: name.trim(),
      description: description.trim() || null,
      costPoints: Math.max(1, parseInt(costPoints, 10) || 1),
    });
    router.back();
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xxl }}>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Nouvelle récompense</Text>
        <TextField label="Nom" value={name} onChangeText={setName} placeholder="Choisir le film" autoFocus />
        <TextField
          label="Description (facultatif)"
          value={description}
          onChangeText={setDescription}
          placeholder="Détails..."
        />
        <TextField
          label="Coût en Dones"
          value={costPoints}
          onChangeText={setCostPoints}
          keyboardType="number-pad"
        />
        <Button label="Créer" onPress={onSubmit} loading={createReward.isPending} disabled={!name.trim()} size="lg" />
      </View>
    </Screen>
  );
}
