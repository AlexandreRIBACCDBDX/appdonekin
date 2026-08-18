import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/providers/AuthProvider';
import { useCreateCircle } from '@/hooks/useCircles';
import { useActiveCircleStore } from '@/store/useActiveCircleStore';
import type { CircleType } from '@/types/database';

const CIRCLE_TYPES: { value: CircleType; label: string; emoji: string }[] = [
  { value: 'family', label: 'Famille', emoji: '👨‍👩‍👧‍👦' },
  { value: 'friends', label: 'Amis', emoji: '🎉' },
  { value: 'couple', label: 'Couple', emoji: '💛' },
  { value: 'roommates', label: 'Colocation', emoji: '🏠' },
  { value: 'other', label: 'Autre', emoji: '✨' },
];

export default function CreateCircleFromAppScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<CircleType>('friends');
  const setActiveCircleId = useActiveCircleStore((s) => s.setActiveCircleId);
  const createCircle = useCreateCircle();

  const onSubmit = async () => {
    const circle = await createCircle.mutateAsync({
      name: name.trim(),
      type,
      displayName: profile?.full_name?.split(' ')[0] ?? 'Moi',
    });
    setActiveCircleId(circle.id);
    router.replace('/(app)/(tabs)');
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xxl }}>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Nouveau cercle</Text>

        <TextField label="Nom du cercle" value={name} onChangeText={setName} placeholder="Vacances Espagne" />

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {CIRCLE_TYPES.map((option) => {
              const selected = option.value === type;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setType(option.value)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.full,
                    backgroundColor: selected ? colors.primaryMuted : colors.surfaceMuted,
                  }}
                >
                  <Text>{option.emoji}</Text>
                  <Text style={[typography.body, { color: selected ? colors.primary : colors.textPrimary }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button label="Créer" onPress={onSubmit} loading={createCircle.isPending} disabled={!name.trim()} size="lg" />
      </View>
    </Screen>
  );
}
