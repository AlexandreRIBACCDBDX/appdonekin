import { Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { DonesAmount } from '@/components/ui/DonesAmount';
import { useTheme } from '@/hooks/useTheme';
import { palette } from '@/constants/theme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useWeeklyLeaderboard } from '@/hooks/useLeaderboard';
import type { LeaderboardEntry } from '@/services/leaderboard';

const MEDAL_COLORS = [palette.gold500, palette.lavender, palette.flame500];

// Deliberately a "soft" ranking, not a strict competitive one: a podium for
// the top 3 celebrates who's ahead, but anyone further down only ever sees
// their own rank/points — never a full last-to-first list that could turn a
// less active member (a young kid vs. a very active parent) into a visible
// "loser".
export function WeeklyLeaderboard() {
  const { colors, spacing, typography } = useTheme();
  const { circle, myMembership } = useActiveCircle();
  const { data: entries, error } = useWeeklyLeaderboard(circle?.id ?? null);

  if (error) {
    return (
      <Card style={{ padding: spacing.xl }}>
        <Text style={[typography.caption, { color: colors.danger }]}>
          Classement indisponible : {error instanceof Error ? error.message : String(error)}
        </Text>
      </Card>
    );
  }

  if (!entries || entries.length === 0) return null;

  const hasAnyPoints = entries.some((e) => e.points_earned > 0);
  const ranked = entries.slice(0, 3).map((e, i) => ({ ...e, rank: i + 1 }));
  const myRank = entries.findIndex((e) => e.member_id === myMembership?.id) + 1;
  const myEntry = myRank > 0 ? entries[myRank - 1] : null;
  const showMyProgress = !!myEntry && myRank > 3;

  return (
    <Card style={{ padding: spacing.xl }}>
      <Text style={[typography.heading, { color: colors.textPrimary }]}>Classement de la semaine</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
        Qui a gagné le plus de Dones depuis lundi
      </Text>

      {!hasAnyPoints ? (
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.lg }]}>
          Personne n&apos;a encore gagné de Dones cette semaine — à toi de lancer le mouvement 🚀
        </Text>
      ) : (
        <>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'flex-end',
              gap: spacing.lg,
              marginTop: spacing.xl,
            }}
          >
            {[ranked[1], ranked[0], ranked[2]].map((entry, i) =>
              entry ? (
                <PodiumSlot key={entry.member_id} entry={entry} rank={entry.rank} isMe={entry.member_id === myMembership?.id} />
              ) : (
                <View key={`empty-${i}`} style={{ width: 72 }} />
              )
            )}
          </View>

          {showMyProgress && myEntry ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: spacing.lg,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text style={[typography.body, { color: colors.textSecondary }]}>Ta progression • #{myRank}</Text>
              <DonesAmount
                value={myEntry.points_earned}
                size={14}
                gap={4}
                textStyle={[typography.label, { color: colors.textPrimary }]}
              />
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

function PodiumSlot({
  entry,
  rank,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
}) {
  const { colors, spacing, typography } = useTheme();
  const isFirst = rank === 1;
  const medalColor = MEDAL_COLORS[rank - 1];
  const avatarSize = isFirst ? 60 : 46;

  return (
    <View style={{ alignItems: 'center', gap: spacing.xs, width: 72, marginBottom: isFirst ? 0 : spacing.md }}>
      <View>
        <Avatar name={entry.first_name} uri={entry.avatar_url} size={avatarSize} ringColor={medalColor} />
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: medalColor,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.background }}>{rank}</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={[typography.caption, { color: colors.textPrimary, fontWeight: isMe ? '800' : '600' }]}>
        {isMe ? 'Toi' : entry.first_name}
      </Text>
      <DonesAmount value={entry.points_earned} size={12} gap={3} textStyle={[typography.caption, { color: colors.textSecondary }]} />
    </View>
  );
}
