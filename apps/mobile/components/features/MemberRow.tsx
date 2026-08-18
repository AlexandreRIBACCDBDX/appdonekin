import { Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { DonesCoinIcon } from '@/components/ui/DonesCoinIcon';
import { useTheme } from '@/hooks/useTheme';
import type { CircleMember } from '@/types/database';

const ROLE_LABELS: Record<CircleMember['role'], string> = {
  owner: 'Admin • Parent',
  admin: 'Admin',
  parent: 'Parent',
  member: 'Membre',
  child: 'Enfant',
};

interface MemberRowProps {
  member: CircleMember;
  points?: number;
  guardianNames?: string[];
  right?: React.ReactNode;
}

export function MemberRow({ member, points, guardianNames, right }: MemberRowProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Avatar name={member.first_name} uri={member.avatar_url} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typography.heading, { color: colors.textPrimary }]}>{member.first_name}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{ROLE_LABELS[member.role]}</Text>
        {member.access_mode === 'guardian_managed' && guardianNames && guardianNames.length > 0 ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Géré par {guardianNames.join(' et ')}
          </Text>
        ) : null}
      </View>
      {typeof points === 'number' ? (
        <Badge label={String(points)} tone="dones" icon={<DonesCoinIcon size={12} />} />
      ) : null}
      {right}
    </View>
  );
}
