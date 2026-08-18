import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
  ringColor?: string;
}

const BG_COLORS = ['#6366F1', '#F5A623', '#16A34A', '#DC2626', '#0EA5E9', '#9333EA'];

function colorForName(name: string) {
  const index = name.charCodeAt(0) % BG_COLORS.length;
  return BG_COLORS[index];
}

export function Avatar({ name, uri, size = 44, ringColor }: AvatarProps) {
  const { colors } = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: ringColor ? 2 : 0,
    borderColor: ringColor ?? 'transparent',
  };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, containerStyle]} />;
  }

  return (
    <View style={[styles.fallback, containerStyle, { backgroundColor: colorForName(name) }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4, color: colors.textOnPrimary }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { resizeMode: 'cover' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '700' },
});
