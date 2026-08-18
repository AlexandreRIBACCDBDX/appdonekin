import Svg, { Circle, Defs, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

// The Dones coin — DoneKin's own currency, never called "points" in the UI.
// A "D" embossed into the metal, always shown instead of the word "Dones".
export function DonesCoinIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <RadialGradient id="coinGrad" cx="35%" cy="30%" r="75%">
          <Stop offset="0%" stopColor="#FFE9A8" />
          <Stop offset="55%" stopColor="#F5B93F" />
          <Stop offset="100%" stopColor="#D98D14" />
        </RadialGradient>
      </Defs>
      <Circle cx={12} cy={12} r={11} fill="url(#coinGrad)" />
      <Circle cx={12} cy={12} r={8.7} fill="none" stroke="#B9740E" strokeWidth={0.9} opacity={0.5} />
      <SvgText x={12} y={16.3} textAnchor="middle" fontSize={12.5} fontWeight="800" fill="#8A4D06">
        D
      </SvgText>
    </Svg>
  );
}
