import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {evidence} from '../storyboard.mjs';
import {clamp, colors, fontFamily, glass, monoFamily, phaseOpacity} from '../styles';
import {Metric, TopChrome} from './Primitives';

export const ExperimentWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = phaseOpacity(frame, 4780, 5120, 24);
  const local = frame - 4800;
  const split = clamp(local, [20, 90], [0, 1]);
  const retract = clamp(local, [170, 270], [0, 1]);
  return (
    <AbsoluteFill style={{opacity}}>
      <TopChrome section="A branch we chose not to ship" />
      <div style={{left: 0, position: 'absolute', right: 0, top: 265}}>
        <div style={{background: 'rgba(97,168,255,0.12)', height: 5, left: 170, position: 'absolute', right: 170, top: 250}} />
        <div style={{background: colors.blue, borderRadius: 99, boxShadow: `0 0 24px ${colors.blue}`, height: 17, left: 180, position: 'absolute', top: 244, width: 17}} />
        <div style={{color: colors.text, fontFamily: monoFamily, fontSize: 18, left: 220, position: 'absolute', top: 236}}>RULE PIPELINE · 0.866507</div>
        <div
          style={{
            background: colors.red,
            height: 4,
            left: 560,
            opacity: split * (1 - retract),
            position: 'absolute',
            rotate: '-19deg',
            top: 194,
            transformOrigin: 'left center',
            width: 620,
          }}
        />
        <div
          style={{
            ...glass,
            borderColor: 'rgba(255,107,120,0.35)',
            borderRadius: 24,
            left: 1050,
            opacity: split * (1 - retract),
            padding: '24px 28px',
            position: 'absolute',
            top: -70,
            translate: `${retract * 170}px ${-retract * 60}px`,
            width: 520,
          }}
        >
          <div style={{color: colors.red, fontFamily: monoFamily, fontSize: 15}}>EXPERIMENTAL BRANCH</div>
          <div style={{color: colors.text, fontFamily, fontSize: 33, fontWeight: 740, marginTop: 12}}>Local cross-encoder</div>
          <div style={{color: colors.muted, fontFamily, fontSize: 23, marginTop: 10}}>Composite score moved down.</div>
          <div style={{color: colors.red, fontFamily: monoFamily, fontSize: 35, fontWeight: 780, marginTop: 20}}>0.866507 → 0.8534</div>
        </div>
      </div>
      <div style={{bottom: 190, left: 170, position: 'absolute', right: 170, textAlign: 'center'}}>
        <div style={{color: colors.text, fontFamily, fontSize: 58, fontWeight: 770, letterSpacing: -2.4}}>
          Ship the mechanism that works.
        </div>
        <div style={{color: colors.muted, fontFamily, fontSize: 26, marginTop: 16}}>Not the largest model.</div>
      </div>
    </AbsoluteFill>
  );
};

export const CommercialWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = phaseOpacity(frame, 5070, 5270, 20);
  const local = frame - 5100;
  return (
    <AbsoluteFill style={{opacity}}>
      <TopChrome section="Demo-only extension" evidence={false} />
      <div
        style={{
          ...glass,
          borderColor: 'rgba(188,140,255,0.42)',
          borderRadius: 34,
          left: 230,
          padding: 42,
          position: 'absolute',
          right: 230,
          top: 220,
        }}
      >
        <div style={{alignItems: 'center', display: 'flex'}}>
          <div>
            <div style={{color: colors.violet, fontFamily: monoFamily, fontSize: 17, letterSpacing: 1.3}}>DEMO-ONLY SIMULATION</div>
            <div style={{color: colors.text, fontFamily, fontSize: 54, fontWeight: 770, marginTop: 13}}>Transparent sponsored placement</div>
          </div>
          <div style={{marginLeft: 'auto', textAlign: 'right'}}>
            <div style={{color: colors.muted, fontFamily: monoFamily, fontSize: 15}}>AUCTION</div>
            <div style={{color: colors.violet, fontFamily: monoFamily, fontSize: 39, fontWeight: 760, marginTop: 8}}>eCPM = bid × relevance</div>
          </div>
        </div>
        <div style={{display: 'grid', gap: 18, gridTemplateColumns: '1fr 1fr 1fr', marginTop: 42}}>
          {[
            ['Relevant · lower bid', '$1.00 × 0.96', colors.green],
            ['Irrelevant · higher bid', '$5.00 × 0.08', colors.red],
            ['Organic ordering', 'PRESERVED', colors.blueBright],
          ].map(([label, value, tone], index) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.035)',
                border: `1px solid ${colors.border}`,
                borderRadius: 22,
                opacity: clamp(local, [index * 22, index * 22 + 30], [0, 1]),
                padding: 24,
              }}
            >
              <div style={{color: colors.muted, fontFamily, fontSize: 21}}>{label}</div>
              <div style={{color: tone, fontFamily: monoFamily, fontSize: 30, fontWeight: 760, marginTop: 15}}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const CloseWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = phaseOpacity(frame, 5220, 5401, 22);
  const local = frame - 5250;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity}}>
      <div
        style={{
          background: colors.blue,
          borderRadius: 99,
          boxShadow: `0 0 44px ${colors.blue}`,
          height: 13,
          opacity: clamp(local, [0, 30], [0, 1]),
          width: 13,
        }}
      />
      <div style={{color: colors.text, fontFamily, fontSize: 92, fontWeight: 800, letterSpacing: -5, marginTop: 26}}>
        Shopping Copilot
      </div>
      <div style={{color: colors.muted, fontFamily, fontSize: 28, marginTop: 17}}>
        Conversation → state → ranking → evidence
      </div>
      <div style={{display: 'flex', gap: 26, marginTop: 52}}>
        <div style={{...glass, borderRadius: 18, color: colors.blueBright, fontFamily: monoFamily, fontSize: 18, padding: '17px 22px'}}>
          github.com/Starryyu77/techjam-shopping-agent-v1
        </div>
        <div style={{...glass, borderRadius: 18, color: colors.green, fontFamily: monoFamily, fontSize: 18, padding: '17px 22px'}}>
          shopping-copilot-techjam.pages.dev
        </div>
      </div>
      <div style={{color: colors.amber, fontFamily: monoFamily, fontSize: 16, letterSpacing: 1.2, marginTop: 42}}>
        OFFICIAL PUBLIC-SET RESULT · PRIVATE 800 PERFORMANCE UNKNOWN
      </div>
      <div style={{bottom: 80, color: colors.muted, fontFamily: monoFamily, fontSize: 15, position: 'absolute'}}>
        TECHNICAL SCORE {evidence.metrics.technicalScore.toFixed(6)} · HIT RATE@10 {evidence.metrics.hitRateAt10.toFixed(3)}
      </div>
    </AbsoluteFill>
  );
};
