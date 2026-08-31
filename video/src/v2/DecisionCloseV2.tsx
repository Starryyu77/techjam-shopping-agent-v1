import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {evidence} from '../storyboard.mjs';
import {alpha, interp} from './motion';
import {displayFont, monoFont, v2} from './styles';

export const DecisionBranchV2: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  const opacity = alpha(frame, 159.2, 170.7, 0.65);
  const branch = interp(second, [160.5, 164], [0, 1]);
  const retract = interp(second, [166, 169.5], [0, 1]);
  const sceneReveal = interp(second, [160.5, 161.2], [0, 1]);
  const titleReveal = interp(second, [160.7, 161.4], [0, 1]);
  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{color: v2.cream, fontFamily: displayFont, fontSize: 78, fontWeight: 760, left: 94, letterSpacing: -4, opacity: titleReveal, position: 'absolute', top: 126}}>
        A more complex branch lost.
      </div>
      <div style={{color: v2.creamMuted, fontFamily: displayFont, fontSize: 24, left: 98, opacity: titleReveal, position: 'absolute', top: 224}}>
        The experiment stayed in the evidence. It did not enter the submitted path.
      </div>
      <svg height="440" style={{left: 80, opacity: sceneReveal, overflow: 'visible', position: 'absolute', top: 250, width: 1760}} viewBox="0 0 1760 440">
        <path d="M80 255 C 430 255, 650 255, 910 255 S 1360 255, 1680 255" fill="none" stroke="rgba(84,223,162,0.18)" strokeWidth="5" />
        <path d="M80 255 C 430 255, 650 255, 910 255 S 1360 255, 1680 255" fill="none" pathLength="1" stroke={v2.green} strokeDasharray="1" strokeDashoffset={0.08} strokeLinecap="round" strokeWidth="7" />
        <path
          d="M650 255 C 820 80, 1110 70, 1400 130"
          fill="none"
          pathLength="1"
          stroke={v2.red}
          strokeDasharray="1"
          strokeDashoffset={1 - branch * (1 - retract)}
          strokeLinecap="round"
          strokeWidth="6"
        />
      </svg>
      <div style={{bottom: 284, color: v2.green, fontFamily: monoFont, fontSize: 16, left: 118, letterSpacing: 1, opacity: sceneReveal, position: 'absolute'}}>
        RULE PIPELINE · {evidence.metrics.technicalScore.toFixed(6)} · SHIPPED
      </div>
      <div
        style={{
          border: `1px solid rgba(255,102,115,0.42)`,
          color: v2.cream,
          opacity: branch * (1 - retract),
          padding: '26px 30px',
          position: 'absolute',
          right: 200,
          top: 315,
          translate: `${retract * 160}px ${-retract * 80}px`,
          width: 470,
        }}
      >
        <div style={{color: v2.red, fontFamily: monoFont, fontSize: 12, letterSpacing: 1}}>LOCAL CROSS-ENCODER</div>
        <div style={{fontFamily: displayFont, fontSize: 35, fontWeight: 650, marginTop: 12}}>Composite score decreased.</div>
        <div style={{color: v2.red, fontFamily: monoFont, fontSize: 34, fontWeight: 760, marginTop: 20}}>0.866507 → 0.8534</div>
      </div>
      <div style={{bottom: 168, color: v2.cream, fontFamily: displayFont, fontSize: 43, fontWeight: 680, left: 98, letterSpacing: -1.5, opacity: sceneReveal, position: 'absolute'}}>
        Reliability won. Not model size.
      </div>
    </AbsoluteFill>
  );
};

export const CommercialFlashV2: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  const opacity = alpha(frame, 169.8, 175.4, 0.7);
  const reveal = interp(second, [170.5, 173], [0, 1]);
  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{borderTop: `1px solid rgba(255,180,84,0.42)`, left: 96, opacity: reveal, position: 'absolute', right: 96, top: 220}} />
      <div style={{color: v2.amber, fontFamily: monoFont, fontSize: 13, left: 96, letterSpacing: 1, opacity: reveal, position: 'absolute', top: 178}}>
        DEMO-ONLY SIMULATION
      </div>
      <div style={{color: v2.cream, fontFamily: displayFont, fontSize: 72, fontWeight: 750, left: 94, letterSpacing: -3.8, opacity: reveal, position: 'absolute', top: 278}}>
        Sponsorship stays transparent.
      </div>
      <div style={{color: v2.creamMuted, fontFamily: displayFont, fontSize: 26, left: 98, opacity: reveal, position: 'absolute', top: 378}}>
        Relevance-aware auction. Organic order preserved.
      </div>
      <div style={{alignItems: 'center', display: 'flex', gap: 26, position: 'absolute', right: 120, top: 286}}>
        <div style={{opacity: reveal}}>
          <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 12}}>LOWER BID · HIGH RELEVANCE</div>
          <div style={{color: v2.green, fontFamily: monoFont, fontSize: 42, fontWeight: 760, marginTop: 10}}>$1 × 0.96</div>
        </div>
        <div style={{color: v2.amber, fontFamily: displayFont, fontSize: 42, opacity: reveal}}>beats</div>
        <div style={{opacity: reveal}}>
          <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 12}}>HIGHER BID · LOW RELEVANCE</div>
          <div style={{color: v2.red, fontFamily: monoFont, fontSize: 42, fontWeight: 760, marginTop: 10}}>$5 × 0.08</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const CloseoutV2: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  const opacity = alpha(frame, 174.2, 181, 0.85);
  const reveal = interp(second, [175.2, 177], [0, 1]);
  return (
    <AbsoluteFill style={{opacity}}>
      <AbsoluteFill style={{opacity: reveal}}>
      <div style={{background: v2.greenDeep, height: 12, left: 94, position: 'absolute', top: 138, width: 74}} />
      <div style={{color: v2.ink, fontFamily: displayFont, fontSize: 124, fontWeight: 790, left: 90, letterSpacing: -8, lineHeight: 0.92, position: 'absolute', top: 190}}>
        Shopping
        <br />Copilot
      </div>
      <div style={{color: '#51555a', fontFamily: displayFont, fontSize: 31, left: 98, position: 'absolute', top: 470}}>
        Conversation → state → ranking → evidence
      </div>
      <div style={{borderLeft: `1px solid rgba(11,13,15,0.22)`, height: 520, position: 'absolute', right: 800, top: 128}} />
      <div style={{opacity: reveal, position: 'absolute', right: 100, top: 180, width: 610}}>
        <div style={{color: v2.greenDeep, fontFamily: monoFont, fontSize: 12, letterSpacing: 1.1}}>PUBLIC LINKS</div>
        <div style={{borderBottom: '1px solid rgba(11,13,15,0.18)', color: v2.ink, fontFamily: monoFont, fontSize: 20, marginTop: 38, paddingBottom: 22}}>
          github.com/Starryyu77/techjam-shopping-agent-v1
        </div>
        <div style={{borderBottom: '1px solid rgba(11,13,15,0.18)', color: v2.ink, fontFamily: monoFont, fontSize: 20, padding: '22px 0'}}>
          shopping-copilot-techjam.pages.dev
        </div>
        <div style={{color: '#6f5427', fontFamily: monoFont, fontSize: 14, lineHeight: 1.6, marginTop: 38}}>
          OFFICIAL PUBLIC-SET RESULT
          <br />PRIVATE 800 PERFORMANCE UNKNOWN
        </div>
        <div style={{color: v2.greenDeep, fontFamily: monoFont, fontSize: 42, fontWeight: 760, marginTop: 42}}>
          TS · {evidence.metrics.technicalScore.toFixed(6)}
        </div>
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
