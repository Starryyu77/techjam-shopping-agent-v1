import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {evidence} from '../storyboard.mjs';
import {alpha, interp} from './motion';
import {cardShadow, displayFont, monoFont, v2} from './styles';

const QueryLine: React.FC<{
  text: string;
  start: number;
  x: number;
  y: number;
  tone?: string;
}> = ({text, start, x, y, tone = v2.cream}) => {
  const frame = useCurrentFrame();
  const reveal = interp(frame, [start, start + 20], [0, 1]);
  return (
    <div
      style={{
        color: tone,
        fontFamily: displayFont,
        fontSize: 48,
        fontWeight: 590,
        left: x,
        letterSpacing: -1.6,
        opacity: reveal,
        position: 'absolute',
        top: y,
        translate: `${-36 * (1 - reveal)}px 0`,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

export const OpeningV2: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = alpha(frame, 0, 30.5, 0.65);
  const scoreP = interp(frame, [600, 850], [0, 1]);
  const score = evidence.starter.technicalScore +
    (evidence.metrics.technicalScore - evidence.starter.technicalScore) * scoreP;
  const firstAct = interp(frame, [0, 430, 510], [1, 1, 0]);
  const resultAct = interp(frame, [440, 530], [0, 1]);
  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{opacity: firstAct}}>
        <div
          style={{
            color: v2.amber,
            fontFamily: monoFont,
            fontSize: 14,
            left: 104,
            letterSpacing: 1.3,
            position: 'absolute',
            top: 126,
          }}
        >
          A SHOPPER DOESN'T SPEAK IN FILTERS
        </div>
        <div style={{background: v2.amber, height: 590, left: 102, opacity: 0.8, position: 'absolute', top: 174, width: 2}} />
        <QueryLine text="I need a long-torso camisole." start={12} x={150} y={188} />
        <QueryLine text="Adjustable straps." start={155} x={230} y={286} tone={v2.blue} />
        <QueryLine text="Actually, make it polyester." start={300} x={310} y={384} tone={v2.amber} />
        <div
          style={{
            background: 'linear-gradient(140deg,rgba(243,238,228,0.13),rgba(243,238,228,0.025))',
            border: `1px solid ${v2.line}`,
            borderRadius: '14px 58px 14px 58px',
            boxShadow: cardShadow,
            height: 520,
            opacity: interp(frame, [180, 340], [0, 1]),
            position: 'absolute',
            right: 110,
            rotate: '4deg',
            top: 150,
            width: 520,
          }}
        >
          {['category · tanks & camis', 'feature · adjustable', 'material · polyester'].map((label, index) => (
            <div
              key={label}
              style={{
                borderBottom: index < 2 ? `1px solid ${v2.line}` : undefined,
                color: index === 2 ? v2.green : v2.creamMuted,
                fontFamily: monoFont,
                fontSize: 17,
                left: 44,
                opacity: interp(frame, [230 + index * 82, 260 + index * 82], [0, 1]),
                padding: '27px 0',
                position: 'absolute',
                right: 44,
                top: 92 + index * 100,
              }}
            >
              {index === 2 ? '+ ' : index === 1 ? '− ' : '↳ '}{label}
            </div>
          ))}
        </div>
      </div>

      <div style={{opacity: resultAct}}>
        <div
          style={{
            color: v2.cream,
            fontFamily: displayFont,
            fontSize: 118,
            fontWeight: 780,
            left: 118,
            letterSpacing: -7,
            lineHeight: 0.92,
            position: 'absolute',
            top: 180,
          }}
        >
          Conversation
          <br />becomes state.
        </div>
        <div style={{bottom: 218, display: 'flex', gap: 70, left: 126, position: 'absolute'}}>
          <div>
            <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 13, letterSpacing: 1}}>OFFICIAL STARTER</div>
            <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 44, fontWeight: 700, marginTop: 12}}>{evidence.starter.technicalScore.toFixed(5)}</div>
          </div>
          <div style={{color: v2.amber, fontFamily: displayFont, fontSize: 48, marginTop: 26}}>→</div>
          <div style={{opacity: scoreP}}>
            <div style={{color: v2.green, fontFamily: monoFont, fontSize: 13, letterSpacing: 1}}>PUBLIC-SET SCORE</div>
            <div style={{color: v2.green, fontFamily: monoFont, fontSize: 68, fontWeight: 780, letterSpacing: -3, marginTop: 2}}>{score.toFixed(6)}</div>
          </div>
        </div>
        <div
          style={{
            border: `1px solid rgba(84,223,162,0.34)`,
            borderRadius: '50%',
            boxShadow: '0 0 120px rgba(84,223,162,0.12)',
            height: 540,
            position: 'absolute',
            right: 170,
            top: 150,
            width: 540,
          }}
        >
          {Array.from({length: 48}, (_, index) => {
            const angle = index * 2.39996 + frame / 500;
            const radius = 42 + Math.sqrt(index / 48) * 218;
            return (
              <div
                key={index}
                style={{
                  background: index % 9 === 0 ? v2.green : v2.cream,
                  borderRadius: 99,
                  height: index % 9 === 0 ? 8 : 4,
                  left: 270 + Math.cos(angle) * radius,
                  opacity: 0.25 + (index % 5) * 0.12,
                  position: 'absolute',
                  top: 270 + Math.sin(angle) * radius,
                  width: index % 9 === 0 ? 8 : 4,
                }}
              />
            );
          })}
          <div style={{color: v2.cream, fontFamily: monoFont, fontSize: 62, fontWeight: 740, left: 0, position: 'absolute', right: 0, textAlign: 'center', top: 205}}>50,000</div>
          <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 13, left: 0, letterSpacing: 1.2, position: 'absolute', right: 0, textAlign: 'center', top: 285}}>FROZEN PRODUCTS</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const CatalogTunnelV2: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = alpha(frame, 29.2, 45.2, 0.75);
  const second = frame / fps;
  const contentReveal = interp(second, [31, 32.2], [0, 1]);
  return (
    <AbsoluteFill style={{opacity, perspective: 1200}}>
      {Array.from({length: 90}, (_, index) => {
        const lane = index % 9;
        const row = Math.floor(index / 9);
        const depth = ((row * 150 + (second - 27) * 150) % 1500) - 200;
        const scale = Math.max(0.08, 1 - depth / 1850);
        const spread = 120 + depth * 0.55;
        const x = 960 + (lane - 4) * spread * 0.22;
        const y = 495 + Math.sin(index * 1.7) * spread * 0.24;
        return (
          <div
            key={index}
            style={{
              background: index % 14 === 0 ? v2.amber : v2.green,
              borderRadius: 99,
              boxShadow: index % 14 === 0 ? `0 0 24px ${v2.amber}` : `0 0 16px ${v2.green}`,
              height: 9,
              left: x,
              opacity: Math.max(0, 0.9 - depth / 1600),
              position: 'absolute',
              scale,
              top: y,
              width: 9,
            }}
          />
        );
      })}
      <div style={{left: 108, opacity: contentReveal, position: 'absolute', top: 158}}>
        <div style={{color: v2.green, fontFamily: monoFont, fontSize: 14, letterSpacing: 1.4}}>THE EVIDENCE CONTRACT</div>
        <div style={{color: v2.cream, fontFamily: displayFont, fontSize: 82, fontWeight: 760, letterSpacing: -4, lineHeight: 1.02, marginTop: 22}}>
          A finite world.
          <br />Four failure modes.
        </div>
      </div>
      <div style={{bottom: 190, display: 'flex', gap: 46, left: 112, opacity: contentReveal, position: 'absolute'}}>
        {[
          ['200', 'PUBLIC · VERIFIED', v2.green],
          ['800', 'PRIVATE · UNKNOWN', v2.amber],
          ['10', 'TURN LIMIT', v2.cream],
        ].map(([value, label, tone]) => (
          <div key={label}>
            <div style={{color: tone, fontFamily: monoFont, fontSize: 48, fontWeight: 760}}>{value}</div>
            <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 12, letterSpacing: 1, marginTop: 5}}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{bottom: 190, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', opacity: contentReveal, position: 'absolute', right: 120, width: 500}}>
        {['BUYING', 'BROWSING', 'OVERRIDE', 'BOUNDARY'].map((label, index) => (
          <div key={label} style={{borderBottom: `1px solid ${index === 2 ? v2.amber : v2.line}`, color: index === 2 ? v2.amber : v2.cream, fontFamily: monoFont, fontSize: 15, padding: '12px 4px'}}>{label}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
