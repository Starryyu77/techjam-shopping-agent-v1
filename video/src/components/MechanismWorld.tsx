import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {clamp, colors, fontFamily, glass, monoFamily, phaseOpacity} from '../styles';
import {Chip, TopChrome} from './Primitives';

const nodes = [
  ['MESSAGE', 'Natural request'],
  ['INTENT', 'ITEM · OVERRIDE'],
  ['STATE', 'erase · add · retain'],
  ['RETRIEVE', 'SQLite FTS5'],
  ['RERANK', 'transparent rules'],
  ['TOP-10', 'ranked products'],
];

export const MechanismWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = phaseOpacity(frame, 3280, 3920, 28);
  const local = frame - 3300;
  return (
    <AbsoluteFill style={{opacity}}>
      <TopChrome section="Inside one decision" />
      <div
        style={{
          left: 112,
          position: 'absolute',
          right: 112,
          top: 212,
        }}
      >
        <div style={{color: colors.text, fontFamily, fontSize: 66, fontWeight: 770, letterSpacing: -3.2}}>
          One state. One continuous path.
        </div>
        <div style={{color: colors.muted, fontFamily, fontSize: 25, marginTop: 14}}>
          The objects from the conversation keep moving through the evaluated path.
        </div>
      </div>
      <div
        style={{
          left: 110,
          position: 'absolute',
          right: 110,
          top: 470,
        }}
      >
        <svg height="210" style={{overflow: 'visible', position: 'absolute', width: '100%'}} viewBox="0 0 1700 210">
          <path
            d="M70 105 C 260 15, 330 195, 520 105 S 790 15, 980 105 S 1250 195, 1630 105"
            fill="none"
            stroke="rgba(97,168,255,0.18)"
            strokeWidth="4"
          />
          <path
            d="M70 105 C 260 15, 330 195, 520 105 S 790 15, 980 105 S 1250 195, 1630 105"
            fill="none"
            pathLength="1"
            stroke={colors.blue}
            strokeDasharray="1"
            strokeDashoffset={1 - clamp(local, [0, 520], [0, 1])}
            strokeLinecap="round"
            strokeWidth="6"
            style={{filter: `drop-shadow(0 0 12px ${colors.blue})`}}
          />
        </svg>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', position: 'relative'}}>
          {nodes.map(([label, detail], index) => {
            const reveal = clamp(local, [index * 76, index * 76 + 28], [0, 1]);
            return (
              <div key={label} style={{alignItems: 'center', display: 'flex', flexDirection: 'column', opacity: reveal}}>
                <div
                  style={{
                    ...glass,
                    alignItems: 'center',
                    background: index === 2 ? 'rgba(97,168,255,0.15)' : colors.panel,
                    borderColor: index === 2 ? 'rgba(97,168,255,0.48)' : colors.border,
                    borderRadius: 999,
                    display: 'flex',
                    height: 98,
                    justifyContent: 'center',
                    scale: 0.9 + reveal * 0.1,
                    width: 98,
                  }}
                >
                  <div style={{background: index === 2 ? colors.green : colors.blue, borderRadius: 99, boxShadow: `0 0 24px ${index === 2 ? colors.green : colors.blue}`, height: 13, width: 13}} />
                </div>
                <div style={{color: colors.text, fontFamily: monoFamily, fontSize: 18, fontWeight: 780, letterSpacing: 1, marginTop: 24}}>{label}</div>
                <div style={{color: colors.muted, fontFamily, fontSize: 17, marginTop: 8, textAlign: 'center'}}>{detail}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          bottom: 182,
          display: 'flex',
          gap: 14,
          left: 0,
          opacity: clamp(local, [300, 380], [0, 1]),
          position: 'absolute',
          right: 0,
          justifyContent: 'center',
        }}
      >
        <Chip label="adjustable · removed" tone="red" removed />
        <Chip label="polyester · added" tone="green" />
        <Chip label="category · retained" retained />
      </div>
    </AbsoluteFill>
  );
};
