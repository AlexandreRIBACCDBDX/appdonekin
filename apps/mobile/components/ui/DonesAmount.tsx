import { Text, View, type StyleProp, type TextStyle } from 'react-native';
import { DonesCoinIcon } from './DonesCoinIcon';

interface DonesAmountProps {
  value: number | string;
  size?: number;
  gap?: number;
  textStyle?: StyleProp<TextStyle>;
}

// Plain (non-delta) Dones amount — a coin plus the bare number, no unit word.
// Use this for balances/costs/targets; use `PointsPill` (Badge.tsx) instead
// for a +N/-N reward delta.
export function DonesAmount({ value, size = 16, gap = 6, textStyle }: DonesAmountProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      <DonesCoinIcon size={size} />
      <Text style={textStyle}>{value}</Text>
    </View>
  );
}
