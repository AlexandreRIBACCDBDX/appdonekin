import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export function LoadingState() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
