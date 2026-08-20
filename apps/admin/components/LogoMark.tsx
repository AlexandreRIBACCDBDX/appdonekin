// The DoneKin brand mark, ported from apps/mobile's DoneKinMark/LogoTile —
// an orbit: three nodes of ascending size link along a gradient arc, with a
// checkmark cut into the largest node using the tile's own background color.
export function LogoMark({ size = 28 }: { size?: number }) {
  const tileSize = size;
  const markSize = size * 0.66;
  const offset = (tileSize - markSize) / 2;

  return (
    <div
      style={{
        width: tileSize,
        height: tileSize,
        borderRadius: tileSize * 0.28,
        backgroundColor: '#161225',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={markSize} height={markSize} viewBox="0 0 100 100" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="donekinOrbitGrad" x1="0" y1="100" x2="100" y2="0">
            <stop offset="0%" stopColor="#4F6BFB" />
            <stop offset="55%" stopColor="#9457F7" />
            <stop offset="100%" stopColor="#EF4ECF" />
          </linearGradient>
        </defs>
        <path d="M20 70 Q 20 20 70 20" stroke="url(#donekinOrbitGrad)" strokeWidth={4} strokeLinecap="round" fill="none" />
        <circle cx={20} cy={70} r={7} fill="#4F6BFB" />
        <circle cx={45} cy={66} r={5} fill="#9457F7" />
        <circle cx={70} cy={20} r={10} fill="#EF4ECF" />
        <path
          d="M66 20l3 3l6 -6"
          stroke="#161225"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
