import Svg, { Path } from 'react-native-svg';

// The brand mark: a single checkmark built from two joined strokes in two
// colors — reads as one unambiguous "done," while the two-tone construction
// is a quiet nod to more than one person finishing it together.
export function DoneKinMark({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5.5 13.2L9.6 17.3" stroke="#FFB627" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.6 17.3L19 6.3" stroke="#FFF6EC" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
