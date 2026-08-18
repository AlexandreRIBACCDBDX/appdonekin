import { View } from 'react-native';
import { DoneKinMark } from './DoneKinMark';

export function LogoTile({ size = 56 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: '#FF5A36',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF5A36',
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      <DoneKinMark size={size * 0.52} />
    </View>
  );
}
