import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

// The brand mark: an orbit. Three nodes of ascending size link along a
// gradient arc — tasks (and the people behind them) converging toward
// "done," marked by the small checkmark cut into the largest node.
export function DoneKinMark({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="orbitGrad" x1="0" y1="100" x2="100" y2="0">
          <Stop offset="0%" stopColor="#4F6BFB" />
          <Stop offset="55%" stopColor="#9457F7" />
          <Stop offset="100%" stopColor="#EF4ECF" />
        </LinearGradient>
      </Defs>
      <Path d="M20 70 Q 20 20 70 20" stroke="url(#orbitGrad)" strokeWidth={4} strokeLinecap="round" fill="none" />
      <Circle cx={20} cy={70} r={7} fill="#4F6BFB" />
      <Circle cx={45} cy={66} r={5} fill="#9457F7" />
      <Circle cx={70} cy={20} r={10} fill="#EF4ECF" />
      {/* The checkmark is "cut" from the largest node using LogoTile's own
          background color — this mark is only ever drawn on that tile. */}
      <Path d="M66 20l3 3l6 -6" stroke="#161225" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
