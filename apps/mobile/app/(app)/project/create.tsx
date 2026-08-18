import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { PopupScreen } from '@/components/features/PopupScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useCreateProject } from '@/hooks/useProjects';

export default function CreateProjectScreen() {
  const { colors, typography } = useTheme();
  const { circle, myMembership } = useActiveCircle();
  const createProject = useCreateProject(circle?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promise, setPromise] = useState('');
  const [targetPoints, setTargetPoints] = useState('');

  const onSubmit = async () => {
    if (!myMembership) return;
    const parsedTarget = targetPoints.trim() ? Number(targetPoints.trim().replace(',', '.')) : null;
    const project = await createProject.mutateAsync({
      createdByMemberId: myMembership.id,
      title: title.trim(),
      description: description.trim() || null,
      promiseDescription: promise.trim() || null,
      targetPoints: parsedTarget && parsedTarget > 0 ? parsedTarget : null,
    });
    router.replace({ pathname: '/(app)/project/[id]', params: { id: project.id } });
  };

  return (
    <PopupScreen title="Nouveau projet">
        <TextField label="Titre" value={title} onChangeText={setTitle} placeholder="Organiser Noël" autoFocus />
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
        <TextField
          label="Objectif de Dones à atteindre (facultatif)"
          value={targetPoints}
          onChangeText={setTargetPoints}
          keyboardType="numeric"
          placeholder="Ex : 50"
        />
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Si un objectif est fixé, le projet ne pourra être clôturé que lorsque la cagnotte du projet l'aura atteint.
        </Text>
        <Button label="Créer le projet" onPress={onSubmit} loading={createProject.isPending} disabled={!title.trim()} size="lg" />
    </PopupScreen>
  );
}
