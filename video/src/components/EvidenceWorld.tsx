import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {evidence} from '../storyboard.mjs';
import {clamp, colors, fontFamily, glass, monoFamily, phaseOpacity} from '../styles';
import {Metric, TopChrome} from './Primitives';

export const EvidenceWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = phaseOpacity(frame, 3880, 4820, 30);
  const local = frame - 3900;
  const fill = clamp(local, [0, 240], [0, 1]);
  const topTen = clamp(local, [250, 430], [0, 1]);
  const metrics = clamp(local, [430, 620], [0, 1]);
  const score = evidence.starter.technicalScore +
    (evidence.metrics.technicalScore - evidence.starter.technicalScore) * clamp(local, [500, 620], [0, 1]);
  return (
    <AbsoluteFill style={{opacity}}>
      <TopChrome section="Evidence moves with the ranking" />
      <div style={{left: 104, position: 'absolute', top: 168, width: 560}}>
        <div style={{color: colors.text, fontFamily, fontSize: 70, fontWeight: 780, letterSpacing: -3.5, lineHeight: 1.04}}>
          Recall was full.
          <br />Ranking was not.
        </div>
        <div style={{color: colors.muted, fontFamily, fontSize: 25, lineHeight: 1.52, marginTop: 26}}>
          The probe found every public target in the candidate pool. The remaining work was to lift the right product into the final ten.
        </div>
        <div style={{display: 'flex', gap: 40, marginTop: 44, opacity: metrics}}>
          <Metric label="Retrievable" value="200 / 200" tone={colors.blueBright} />
          <Metric label="Top-10 hits" value="199 / 200" tone={colors.green} />
        </div>
      </div>
      <div
        style={{
          ...glass,
          borderRadius: 32,
          height: 610,
          position: 'absolute',
          right: 100,
          top: 160,
          width: 980,
        }}
      >
        <div style={{color: colors.muted, fontFamily: monoFamily, fontSize: 14, left: 30, letterSpacing: 1.2, position: 'absolute', top: 26}}>
          PUBLIC TARGETS · POOL → TOP-10
        </div>
        {Array.from({length: 200}, (_, index) => {
          const column = index % 20;
          const row = Math.floor(index / 20);
          const startX = 54 + column * 43;
          const startY = 96 + row * 33;
          const selected = index < 199;
          const destinationX = selected ? 655 + (index % 5) * 52 : startX;
          const destinationY = selected ? 92 + (index % 10) * 43 : 485;
          const x = startX + (destinationX - startX) * topTen;
          const y = startY + (destinationY - startY) * topTen;
          return (
            <div
              key={index}
              style={{
                background: selected ? colors.blue : colors.amber,
                borderRadius: 99,
                boxShadow: selected && index % 37 === 0 ? `0 0 14px ${colors.blue}` : undefined,
                height: selected ? 7 : 11,
                left: x,
                opacity: (0.14 + fill * 0.72) * (selected ? 1 : 0.9),
                position: 'absolute',
                top: y,
                width: selected ? 7 : 11,
              }}
            />
          );
        })}
        <div
          style={{
            border: `1px solid rgba(78,213,156,0.42)`,
            borderRadius: 24,
            bottom: 50,
            opacity: topTen,
            position: 'absolute',
            right: 40,
            top: 62,
            width: 310,
          }}
        >
          <div style={{background: colors.panelStrong, color: colors.green, fontFamily: monoFamily, fontSize: 14, left: 18, padding: '0 10px', position: 'absolute', top: -9}}>TOP-10 ZONE</div>
        </div>
      </div>
      <div
        style={{
          ...glass,
          alignItems: 'center',
          borderRadius: 28,
          bottom: 146,
          display: 'flex',
          gap: 62,
          left: 104,
          opacity: metrics,
          padding: '22px 30px',
          position: 'absolute',
          right: 100,
        }}
      >
        <Metric label="Hit Rate@10" value={evidence.metrics.hitRateAt10.toFixed(3)} />
        <Metric label="MRR" value={evidence.metrics.mrr.toFixed(6)} />
        <Metric label="MTTC" value={evidence.metrics.mttc.toFixed(3)} />
        <div style={{height: 70, width: 1, background: colors.border}} />
        <Metric label="Official starter" value={evidence.starter.technicalScore.toFixed(5)} tone={colors.muted} />
        <div style={{color: colors.muted, fontSize: 28}}>→</div>
        <Metric label="Public-set TechnicalScore" value={score.toFixed(6)} tone={colors.green} />
      </div>
    </AbsoluteFill>
  );
};
