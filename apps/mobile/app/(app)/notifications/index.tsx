import { FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { TopChrome } from '@/components/features/TopChrome';
import { BottomNav } from '@/components/features/BottomNav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTheme } from '@/hooks/useTheme';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/useActivity';

export default function NotificationsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (isLoading) return <LoadingState />;

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <Screen padded={false}>
      <TopChrome
        variant="circle"
        title="Activité"
        eyebrow={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'À jour'}
      />
      {unreadCount > 0 ? (
        <View style={{ paddingHorizontal: spacing.xl, alignItems: 'flex-end' }}>
          <Button label="Tout marquer lu" variant="ghost" onPress={() => markAllRead.mutate()} />
        </View>
      ) : null}
      <FlatList
        data={notifications ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.huge }}
        ListEmptyComponent={<EmptyState emoji="🔔" title="Aucune notification" />}
        renderItem={({ item }) => {
          const unread = !item.read_at;
          return (
            <Pressable onPress={() => unread && markRead.mutate(item.id)}>
              <Card style={unread ? { borderColor: colors.primary } : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.full,
                      backgroundColor: colors.surfaceMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="notifications" size={19} color={colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[typography.bodyLarge, { color: colors.textPrimary }]}>{item.title}</Text>
                      {unread ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} /> : null}
                    </View>
                    {item.body ? <Text style={[typography.body, { color: colors.textSecondary }]}>{item.body}</Text> : null}
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {new Date(item.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
      <BottomNav active="notifications" />
    </Screen>
  );
}
