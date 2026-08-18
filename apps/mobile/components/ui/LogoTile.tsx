import { View } from 'react-native';
import { DoneKinMark } from './DoneKinMark';

export function LogoTile({ size = 56 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: '#161225',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <DoneKinMark size={size * 0.66} />
    </View>
  );
}
