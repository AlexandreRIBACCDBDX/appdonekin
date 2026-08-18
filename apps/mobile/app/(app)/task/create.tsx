import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PopupScreen } from '@/components/features/PopupScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { DonesCoinIcon } from '@/components/ui/DonesCoinIcon';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useCircleMembers } from '@/hooks/useMembers';
import { useCreateTask } from '@/hooks/useTasks';

const POINT_PRESETS = [1, 2, 3, 5, 10, 20];
const DUE_PRESETS = [
  { label: "Aujourd'hui", days: 0 },
  { label: 'Demain', days: 1 },
  { label: 'Cette semaine', days: 7 },
  { label: 'Aucune', days: null as number | null },
];

export default function CreateTaskScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const { circle, myMembership } = useActiveCircle();
  const { data: members } = useCircleMembers(circle?.id ?? null);
  const createTask = useCreateTask(circle?.id ?? '');

  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(myMembership?.id ?? null);
  const [points, setPoints] = useState(2);
  const [dueDays, setDueDays] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [description, setDescription] = useState('');

  const isSelf = !!assignedTo && assignedTo === myMembership?.id;

  const onSubmit = async () => {
    if (!circle || !assignedTo) return;
    let dueDate: string | null = null;
    if (dueDays !== null) {
      // End of the target day, not "now + N days" — a task due "aujourd'hui"
      // created at 16:26 shouldn't already be late by 16:27.
      const d = new Date();
      d.setDate(d.getDate() + dueDays);
      d.setHours(23, 59, 59, 999);
      dueDate = d.toISOString();
    }
    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || null,
      assignedToMemberId: assignedTo,
      points,
      dueDate,
      projectId: projectId ?? null,
    });
    router.back();
  };

  return (
    <PopupScreen title="Nouvelle mission">
        <TextField
          value={title}
          onChangeText={setTitle}
          placeholder="Ranger sa chambre"
          autoFocus
          label="Nom de la tâche"
        />

        <View style={{ gap: spacing.md }}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>Pour qui ?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
            {(members ?? []).map((member) => {
              const selected = member.id === assignedTo;
              return (
                <Pressable
                  key={member.id}
                  onPress={() => setAssignedTo(member.id)}
                  style={{ alignItems: 'center', gap: spacing.xs }}
                >
                  <Avatar
                    name={member.first_name}
                    uri={member.avatar_url}
                    size={48}
                    ringColor={selected ? colors.primary : 'transparent'}
                  />
                  <Text style={[typography.caption, { color: selected ? colors.textPrimary : colors.textSecondary, fontWeight: selected ? '700' : '600' }]}>
                    {member.first_name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isSelf ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Dones</Text>
            <Badge label="0.5 — crédité dès que tu la termines" tone="dones" icon={<DonesCoinIcon size={12} />} />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Combien de Dones ?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {POINT_PRESETS.map((value) => {
                const selected = value === points;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setPoints(value)}
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
                    <Text style={{ color: selected ? colors.dones : colors.textPrimary, fontWeight: '600' }}>
                      {value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              La personne assignée devra la terminer, puis tu confirmeras avant que les Dones soient attribués.
            </Text>
          </View>
        )}

        {projectId ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Cette tâche appartient à un projet : les Dones iront au projet, pas au wallet personnel.
          </Text>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>Deadline ?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {DUE_PRESETS.map((preset) => {
              const selected = preset.days === dueDays;
              return (
                <Pressable
                  key={preset.label}
                  onPress={() => setDueDays(preset.days)}
                  style={{
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.lg,
                    borderRadius: radius.full,
                    borderWidth: 1.4,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primaryMuted : colors.surface,
                  }}
                >
                  <Text style={{ color: selected ? colors.primary : colors.textPrimary }}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={() => setShowAdvanced((v) => !v)}>
          <Text style={[typography.body, { color: colors.primary }]}>
            {showAdvanced ? 'Masquer les options avancées' : 'Options avancées'}
          </Text>
        </Pressable>

        {showAdvanced ? (
          <TextField
            label="Description (facultatif)"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Détails..."
          />
        ) : null}

        <Button
          label="Créer la tâche"
          onPress={onSubmit}
          loading={createTask.isPending}
          disabled={!title.trim() || !assignedTo}
          size="lg"
        />
    </PopupScreen>
  );
}
