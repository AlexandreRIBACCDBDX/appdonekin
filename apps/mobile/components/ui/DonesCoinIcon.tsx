import Svg, { Circle, Defs, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

// The Dones coin — DoneKin's own currency, never called "points" in the UI.
// Pink, not gold: ties the currency to the brand's own accent (the orbit
// mark's "done" node) instead of a generic coin color.
export function DonesCoinIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <RadialGradient id="coinGrad" cx="35%" cy="30%" r="75%">
          <Stop offset="0%" stopColor="#FDE0F7" />
          <Stop offset="55%" stopColor="#EF4ECF" />
          <Stop offset="100%" stopColor="#A62D8A" />
        </RadialGradient>
      </Defs>
      <Circle cx={12} cy={12} r={11} fill="url(#coinGrad)" />
      <Circle cx={12} cy={12} r={8.7} fill="none" stroke="#8A2170" strokeWidth={0.9} opacity={0.5} />
      <SvgText x={12} y={16.3} textAnchor="middle" fontSize={12.5} fontWeight="800" fill="#7A1B63">
        D
      </SvgText>
    </Svg>
  );
}
