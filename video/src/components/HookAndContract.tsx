import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {evidence} from '../storyboard.mjs';
import {clamp, colors, fontFamily, glass, monoFamily, phaseOpacity} from '../styles';
import {Chip, MessageBubble, Metric, TopChrome} from './Primitives';

const SearchProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const showSecond = clamp(frame, [150, 174], [0, 1]);
  const showThird = clamp(frame, [300, 324], [0, 1]);
  const conflict = clamp(frame, [320, 390], [0, 1]);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        left: 170,
        position: 'absolute',
        top: 190,
        width: 760,
      }}
    >
      <div style={{color: colors.muted, fontFamily: monoFamily, fontSize: 16, letterSpacing: 1.4}}>
        A SHOPPER SPEAKS NATURALLY
      </div>
      <MessageBubble accent>I need a long-torso camisole with adjustable straps.</MessageBubble>
      <div style={{opacity: showSecond, translate: `0 ${26 * (1 - showSecond)}px`}}>
        <MessageBubble accent>Not cotton. Keep it under 80 dollars.</MessageBubble>
      </div>
      <div style={{opacity: showThird, translate: `0 ${26 * (1 - showThird)}px`}}>
        <MessageBubble accent>Actually—ignore that. What I need is polyester.</MessageBubble>
      </div>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10}}>
        <Chip label="adjustable" removed={conflict > 0.5} />
        <Chip label="not cotton" tone="red" />
        <Chip label="budget ≤ $80" />
        <Chip label="polyester" tone="amber" style={{opacity: showThird}} />
      </div>
    </div>
  );
};

const BrandReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = clamp(frame, [430, 480], [0, 1]);
  const scoreProgress = clamp(frame, [620, 840], [0, 1]);
  const score = evidence.starter.technicalScore +
    (evidence.metrics.technicalScore - evidence.starter.technicalScore) * scoreProgress;
  return (
    <div
      style={{
        left: 1020,
        opacity,
        position: 'absolute',
        top: 196,
        width: 690,
      }}
    >
      <div
        style={{
          color: colors.text,
          fontFamily,
          fontSize: 88,
          fontWeight: 790,
          letterSpacing: -5,
          lineHeight: 0.98,
        }}
      >
        Conversation,
        <br />
        made inspectable.
      </div>
      <div
        style={{
          color: colors.muted,
          fontFamily,
          fontSize: 26,
          lineHeight: 1.55,
          marginTop: 36,
          maxWidth: 580,
        }}
      >
        A deterministic shopping agent that rewrites state, retrieves from a frozen catalog, and exposes the evidence behind every claim.
      </div>
      <div
        style={{
          ...glass,
          borderRadius: 26,
          display: 'flex',
          gap: 44,
          marginTop: 50,
          padding: '28px 32px',
        }}
      >
        <Metric label="Official starter" value={evidence.starter.technicalScore.toFixed(5)} />
        <div style={{alignSelf: 'center', color: colors.muted, fontSize: 30}}>→</div>
        <Metric label="Public-set score" value={score.toFixed(6)} tone={colors.green} />
      </div>
    </div>
  );
};

export const HookWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = phaseOpacity(frame, 0, 900, 22);
  return (
    <AbsoluteFill style={{opacity}}>
      <TopChrome section="Conversation → state" evidence={false} />
      <SearchProblem />
      <BrandReveal />
    </AbsoluteFill>
  );
};

export const ContractWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = phaseOpacity(frame, 880, 1370, 28);
  const local = frame - 900;
  const fieldScale = interpolate(local, [0, 450], [1.08, 0.96], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{opacity}}>
      <TopChrome section="The evidence contract" />
      <div
        style={{
          left: 120,
          position: 'absolute',
          top: 190,
          width: 720,
        }}
      >
        <div style={{color: colors.text, fontFamily, fontSize: 78, fontWeight: 770, letterSpacing: -4, lineHeight: 1.02}}>
          One frozen world.
          <br />Four ways to fail.
        </div>
        <div style={{color: colors.muted, fontFamily, fontSize: 27, lineHeight: 1.55, marginTop: 30}}>
          Buying, browsing, intent override, and boundary behaviour—measured over the same product universe.
        </div>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 13, marginTop: 38}}>
          {['Buying', 'Browsing', 'Intent Override', 'Boundary'].map((label, index) => (
            <Chip key={label} label={label} tone={index === 2 ? 'amber' : 'blue'} />
          ))}
        </div>
      </div>
      <div
        style={{
          ...glass,
          borderRadius: '50%',
          height: 620,
          position: 'absolute',
          right: 170,
          scale: fieldScale,
          top: 170,
          width: 620,
        }}
      >
        {Array.from({length: 96}, (_, index) => {
          const angle = index * 2.39996;
          const radius = 45 + Math.sqrt(index / 96) * 245;
          return (
            <div
              key={index}
              style={{
                background: index % 19 === 0 ? colors.violet : colors.blue,
                borderRadius: 99,
                height: index % 19 === 0 ? 9 : 5,
                left: 310 + Math.cos(angle) * radius,
                opacity: 0.35 + (index % 7) * 0.06,
                position: 'absolute',
                top: 310 + Math.sin(angle) * radius,
                width: index % 19 === 0 ? 9 : 5,
              }}
            />
          );
        })}
        <div style={{left: 0, position: 'absolute', right: 0, textAlign: 'center', top: 232}}>
          <div style={{color: colors.text, fontFamily: monoFamily, fontSize: 62, fontWeight: 800}}>50,000</div>
          <div style={{color: colors.muted, fontFamily: monoFamily, fontSize: 17, letterSpacing: 1.4, marginTop: 8}}>FROZEN PRODUCTS</div>
        </div>
      </div>
      <div
        style={{
          bottom: 150,
          display: 'flex',
          gap: 44,
          position: 'absolute',
          right: 144,
        }}
      >
        <Metric label="Public · verified" value="200" tone={colors.blueBright} />
        <Metric label="Private · unknown" value="800" tone={colors.amber} />
        <Metric label="Turn limit" value="10" tone={colors.text} />
      </div>
    </AbsoluteFill>
  );
};
