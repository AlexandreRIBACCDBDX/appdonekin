import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { useAddCircleMember } from '@/hooks/useMembers';
import type { MemberType } from '@/types/database';

const MEMBER_TYPES: { value: MemberType; label: string; emoji: string }[] = [
  { value: 'parent', label: 'Parent', emoji: '🧑' },
  { value: 'child', label: 'Enfant', emoji: '🧒' },
  { value: 'friend', label: 'Ami', emoji: '🙋' },
  { value: 'other', label: 'Autre', emoji: '👤' },
];

interface AddMemberFormProps {
  circleId: string;
  onDone?: () => void;
}

// The one place in the app where "has_phone" is asked in plain language —
// everything downstream (access_mode, guardian_relationships) is derived
// from this, never exposed to the user directly.
export function AddMemberForm({ circleId, onDone }: AddMemberFormProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [memberType, setMemberType] = useState<MemberType>('child');
  const [hasOwnAccess, setHasOwnAccess] = useState<boolean | null>(null);
  const addMember = useAddCircleMember(circleId);

  const [error, setError] = useState<string | null>(null);

  const isChild = memberType === 'child';
  const canSubmit = firstName.trim().length > 0 && (!isChild || hasOwnAccess !== null);

  const onSubmit = async () => {
    setError(null);
    try {
      await addMember.mutateAsync({
        firstName: firstName.trim(),
        memberType,
        hasPhone: isChild ? !!hasOwnAccess : true,
      });
      setFirstName('');
      setMemberType('child');
      setHasOwnAccess(null);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField label="Prénom" value={firstName} onChangeText={setFirstName} placeholder="Lucas" />

      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.label, { color: colors.textSecondary }]}>Type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {MEMBER_TYPES.map((option) => {
            const selected = option.value === memberType;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  setMemberType(option.value);
                  if (option.value !== 'child') setHasOwnAccess(null);
                }}
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

      {isChild ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>
            {firstName.trim() || 'Cet enfant'} utilisera-t-il DoneKin sur son propre appareil ?
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable
              onPress={() => setHasOwnAccess(true)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                backgroundColor: hasOwnAccess === true ? colors.primaryMuted : colors.surfaceMuted,
              }}
            >
              <Text style={{ color: hasOwnAccess === true ? colors.primary : colors.textPrimary }}>Oui</Text>
            </Pressable>
            <Pressable
              onPress={() => setHasOwnAccess(false)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                backgroundColor: hasOwnAccess === false ? colors.primaryMuted : colors.surfaceMuted,
              }}
            >
              <Text style={{ color: hasOwnAccess === false ? colors.primary : colors.textPrimary }}>
                Non, je gérerai son profil
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}

      <Button label="Ajouter" onPress={onSubmit} loading={addMember.isPending} disabled={!canSubmit} />
    </View>
  );
}
