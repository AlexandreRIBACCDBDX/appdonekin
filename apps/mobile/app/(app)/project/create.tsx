import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { PopupScreen } from '@/components/features/PopupScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { DonesCoinIcon } from '@/components/ui/DonesCoinIcon';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useCreateProject } from '@/hooks/useProjects';

const TARGET_PRESETS = [20, 50, 100, 200, 500];

export default function CreateProjectScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { circle, myMembership } = useActiveCircle();
  const createProject = useCreateProject(circle?.id ?? '');
  const [title, setTitle] = useState('');
  const [targetPoints, setTargetPoints] = useState('');
  const [description, setDescription] = useState('');
  const [promise, setPromise] = useState('');

  const parsedTarget = targetPoints.trim() ? Number(targetPoints.trim().replace(',', '.')) : null;
  const hasValidTarget = !!parsedTarget && parsedTarget > 0;

  const onSubmit = async () => {
    if (!myMembership || !hasValidTarget) return;
    const project = await createProject.mutateAsync({
      createdByMemberId: myMembership.id,
      title: title.trim(),
      description: description.trim() || null,
      promiseDescription: promise.trim() || null,
      targetPoints: parsedTarget,
    });
    router.replace({ pathname: '/(app)/project/[id]', params: { id: project.id } });
  };

  return (
    <PopupScreen title="Nouveau projet">
      <TextField label="Titre" value={title} onChangeText={setTitle} placeholder="Organiser Noël" autoFocus />

      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.label, { color: colors.textSecondary }]}>Objectif à atteindre</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {TARGET_PRESETS.map((value) => {
            const selected = parsedTarget === value;
            return (
              <Pressable
                key={value}
                onPress={() => setTargetPoints(String(value))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.full,
                  borderWidth: 1.4,
                  borderColor: selected ? colors.dones : colors.border,
                  backgroundColor: selected ? colors.donesMuted : colors.surface,
                }}
              >
                <DonesCoinIcon size={12} />
                <Text style={{ color: selected ? colors.dones : colors.textPrimary, fontWeight: '600' }}>{value}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextField
          value={targetPoints}
          onChangeText={setTargetPoints}
          keyboardType="numeric"
          placeholder="Ou un autre montant"
        />
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Les tâches liées à ce projet créditent directement cette cagnotte, et chacun pourra aussi y contribuer
          depuis son propre wallet. Le projet ne pourra être clôturé qu'une fois l'objectif atteint.
        </Text>
      </View>

      <TextField
        label="Description (facultatif)"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Détails..."
      />
      <TextField
        label="Ton engagement personnel (facultatif)"
        value={promise}
        onChangeText={setPromise}
        multiline
        placeholder="Ce que tu t'engages à apporter ou réaliser pour ce projet..."
      />
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        À la fin du projet, les autres membres confirmeront si cet engagement a été tenu — si oui, tu recevras +10
        Dones.
      </Text>

      <Button
        label="Créer le projet"
        onPress={onSubmit}
        loading={createProject.isPending}
        disabled={!title.trim() || !hasValidTarget}
        size="lg"
      />
    </PopupScreen>
  );
}
