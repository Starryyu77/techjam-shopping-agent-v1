import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {evidence} from '../storyboard.mjs';
import {alpha, interp} from './motion';
import {displayFont, monoFont, v2} from './styles';

export const RetrievalTunnelV2: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  const opacity = alpha(frame, 109.2, 136.2, 0.8);
  const progress = interp(second, [108, 138], [0, 1]);
  const titleReveal = interp(second, [111.4, 112.5], [0, 1]);
  return (
    <AbsoluteFill style={{opacity, perspective: 1400}}>
      <div style={{color: v2.cream, fontFamily: displayFont, fontSize: 64, fontWeight: 740, left: 92, letterSpacing: -3, opacity: titleReveal, position: 'absolute', top: 112}}>
        Follow one signal through the system.
      </div>
      <div style={{color: v2.creamMuted, fontFamily: displayFont, fontSize: 23, left: 96, opacity: titleReveal, position: 'absolute', top: 194}}>
        No separate diagram. The polyester token becomes the retrieval input.
      </div>

      {[0, 1, 2, 3].map((ring) => {
        const x = 320 + ring * 420;
        const pulse = 0.82 + Math.sin(frame / 13 + ring) * 0.05;
        const labels = ['STATE', 'FTS5', 'RERANK', 'TOP-10'];
        const details = ['polyester', '50k catalog', 'rule signals', 'ranked output'];
        return (
          <div key={ring} style={{left: x, position: 'absolute', top: 390}}>
            <div
              style={{
                border: `2px solid rgba(84,223,162,${0.18 + ring * 0.05})`,
                borderRadius: '50%',
                boxShadow: ring === 3 ? `0 0 55px rgba(84,223,162,0.14)` : undefined,
                height: 260,
                scale: pulse,
                translate: '-50% -50%',
                width: 260,
              }}
            />
            <div style={{color: ring === 3 ? v2.green : v2.cream, fontFamily: monoFont, fontSize: 15, fontWeight: 700, left: -90, letterSpacing: 1.1, position: 'absolute', textAlign: 'center', top: 156, width: 180}}>{labels[ring]}</div>
            <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 12, left: -90, position: 'absolute', textAlign: 'center', top: 181, width: 180}}>{details[ring]}</div>
          </div>
        );
      })}

      <svg height="360" style={{left: 160, overflow: 'visible', position: 'absolute', top: 210, width: 1600}} viewBox="0 0 1600 360">
        <path d="M120 180 C420 60, 690 300, 940 180 S1320 60, 1510 180" fill="none" stroke="rgba(84,223,162,0.15)" strokeWidth="3" />
        <path
          d="M120 180 C420 60, 690 300, 940 180 S1320 60, 1510 180"
          fill="none"
          pathLength="1"
          stroke={v2.green}
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
          strokeLinecap="round"
          strokeWidth="5"
        />
      </svg>

      {Array.from({length: 56}, (_, index) => {
        const p = Math.max(0, Math.min(1, progress * 1.4 - index / 90));
        const x = 220 + p * 1450;
        const y = 610 + Math.sin(index * 1.8 + p * 8) * (100 * (1 - p));
        return (
          <div
            key={index}
            style={{
              background: index % 11 === 0 ? v2.amber : v2.green,
              borderRadius: 99,
              height: 5,
              left: x,
              opacity: 0.18 + p * 0.7,
              position: 'absolute',
              top: y,
              width: 5,
            }}
          />
        );
      })}
      <div style={{bottom: 170, color: v2.creamMuted, fontFamily: monoFont, fontSize: 13, left: 94, letterSpacing: 1, position: 'absolute'}}>
        CANDIDATES COMPRESS · SIGNAL STAYS TRACEABLE
      </div>
    </AbsoluteFill>
  );
};

export const EvidenceFieldV2: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  const opacity = alpha(frame, 134, 160.8, 0.8);
  const reveal = interp(second, [133, 140], [0, 1]);
  const titleReveal = interp(second, [136.4, 137.5], [0, 1]);
  const metrics = interp(second, [145, 153], [0, 1]);
  const scoreProgress = interp(second, [149, 151.5], [0, 1]);
  const score = evidence.starter.technicalScore +
    (evidence.metrics.technicalScore - evidence.starter.technicalScore) * scoreProgress;

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{left: 92, opacity: titleReveal, position: 'absolute', top: 112}}>
        <div style={{color: v2.green, fontFamily: monoFont, fontSize: 13, letterSpacing: 1.2}}>ONE DOT · ONE PUBLIC TARGET</div>
        <div style={{color: v2.cream, fontFamily: displayFont, fontSize: 84, fontWeight: 760, letterSpacing: -4.5, lineHeight: 0.98, marginTop: 22}}>
          200 entered.
          <br />199 landed.
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(20, 1fr)',
          height: 390,
          position: 'absolute',
          right: 100,
          top: 120,
          width: 870,
        }}
      >
        {Array.from({length: 200}, (_, index) => {
          const delay = (index % 20) * 0.018 + Math.floor(index / 20) * 0.035;
          const p = interp(reveal, [delay, Math.min(1, delay + 0.22)], [0, 1]);
          const miss = index === 199;
          return (
            <div
              key={index}
              style={{
                alignSelf: 'center',
                background: miss ? v2.amber : v2.green,
                borderRadius: 2,
                boxShadow: miss ? `0 0 18px ${v2.amber}` : undefined,
                height: 16,
                justifySelf: 'center',
                opacity: p,
                scale: p,
                width: 16,
              }}
            />
          );
        })}
      </div>
      <div style={{color: v2.amber, fontFamily: monoFont, fontSize: 12, position: 'absolute', right: 94, top: 532}}>
        1 PUBLIC MISS · PRIVATE PERFORMANCE UNKNOWN
      </div>

      <div
        style={{
          bottom: 180,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1.45fr',
          left: 92,
          opacity: metrics,
          position: 'absolute',
          right: 92,
        }}
      >
        {[
          ['HIT RATE@10', '0.995', v2.green],
          ['MRR', '0.644355', v2.cream],
          ['MTTC', '2.215', v2.cream],
        ].map(([label, value, tone]) => (
          <div key={label} style={{borderLeft: `1px solid ${v2.line}`, paddingLeft: 24}}>
            <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 12, letterSpacing: 1}}>{label}</div>
            <div style={{color: tone, fontFamily: monoFont, fontSize: 47, fontWeight: 760, letterSpacing: -2, marginTop: 11}}>{value}</div>
          </div>
        ))}
        <div style={{borderLeft: `1px solid ${v2.line}`, paddingLeft: 32}}>
          <div style={{color: v2.green, fontFamily: monoFont, fontSize: 12, letterSpacing: 1}}>PUBLIC-SET TECHNICAL SCORE</div>
          <div style={{alignItems: 'baseline', display: 'flex', gap: 18, marginTop: 5}}>
            <span style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 22}}>{evidence.starter.technicalScore.toFixed(5)}</span>
            <span style={{color: v2.amber, fontFamily: displayFont, fontSize: 27}}>→</span>
            <span style={{color: v2.green, fontFamily: monoFont, fontSize: 61, fontWeight: 790, letterSpacing: -3}}>{score.toFixed(6)}</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
