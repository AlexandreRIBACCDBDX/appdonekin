import { useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { useRegenerateInviteCode } from '@/hooks/useCircles';

function formatCode(code: string) {
  return code.length > 4 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

export function InviteCodeCard({
  circleId,
  code,
  canManage,
}: {
  circleId: string;
  code: string;
  canManage: boolean;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const [copied, setCopied] = useState(false);
  const regenerate = useRegenerateInviteCode();

  const onCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onShare = () => {
    Share.share({ message: `Rejoins notre cercle sur DoneKin avec le code : ${formatCode(code)}` });
  };

  const onRegenerate = () => {
    Alert.alert(
      'Régénérer le code ?',
      "L'ancien code ne fonctionnera plus. Utile si tu penses qu'il a été partagé par erreur.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Régénérer', style: 'destructive', onPress: () => regenerate.mutate(circleId) },
      ]
    );
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <Text style={[typography.label, { color: colors.textSecondary }]}>Code d&apos;invitation du cercle</Text>
      <Text style={[typography.title, { color: colors.textPrimary, letterSpacing: 2 }]}>{formatCode(code)}</Text>
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Donne ce code à quelqu&apos;un pour qu&apos;il rejoigne directement ton cercle — sans invitation par email.
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          onPress={onCopy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.surfaceMuted,
            borderRadius: radius.full,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
          }}
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.textPrimary} />
          <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>
            {copied ? 'Copié' : 'Copier'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onShare}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.surfaceMuted,
            borderRadius: radius.full,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
          }}
        >
          <Ionicons name="share-outline" size={16} color={colors.textPrimary} />
          <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>Partager</Text>
        </Pressable>
        {canManage ? (
          <Pressable
            onPress={onRegenerate}
            style={{ marginLeft: 'auto', paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}
          >
            <Text style={[typography.caption, { color: colors.danger, fontWeight: '700' }]}>Régénérer</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}
