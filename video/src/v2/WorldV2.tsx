import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, interp} from './motion';
import {displayFont, monoFont, v2} from './styles';

const Dust: React.FC<{tone: string; count?: number; speed?: number}> = ({
  tone,
  count = 72,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({length: count}, (_, index) => {
        const seed = Math.sin(index * 91.17) * 43758.5453;
        const x = ((seed - Math.floor(seed)) * 2050 + frame * speed * (0.08 + (index % 5) * 0.025)) % 2050 - 60;
        const ySeed = Math.sin(index * 47.77) * 9758.13;
        const y = (ySeed - Math.floor(ySeed)) * 920 + 55;
        const size = index % 13 === 0 ? 5 : 2;
        return (
          <div
            key={index}
            style={{
              background: tone,
              borderRadius: 99,
              height: size,
              left: x,
              opacity: 0.12 + (index % 7) * 0.045,
              position: 'absolute',
              top: y,
              width: size,
            }}
          />
        );
      })}
    </>
  );
};

export const WorldBackdropV2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: v2.ink, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 24% 38%, rgba(255,180,84,0.18), transparent 34%), linear-gradient(125deg,#0c0d0f 20%,#18130d 100%)',
          opacity: alpha(frame, 0, 36),
        }}
      >
        <Dust tone={v2.amber} speed={0.4} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 72% 40%, rgba(84,223,162,0.20), transparent 32%), linear-gradient(115deg,#061012,#0a1d1a)',
          opacity: alpha(frame, 28, 54),
        }}
      >
        <Dust tone={v2.green} count={100} speed={1.4} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(128deg,#0b0e11 0%,#10151a 46%,#0a0d10 100%)',
          opacity: alpha(frame, 45, 114),
        }}
      >
        <div
          style={{
            background: 'linear-gradient(90deg,transparent,rgba(243,238,228,0.045),transparent)',
            height: 1,
            left: -300,
            position: 'absolute',
            rotate: '-18deg',
            top: 490,
            width: 2500,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center,rgba(65,214,189,0.17),transparent 54%),#050d0f',
          opacity: alpha(frame, 108, 140),
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 68% 42%,rgba(79,224,157,0.15),transparent 34%),linear-gradient(110deg,#07110d,#0d1712)',
          opacity: alpha(frame, 132, 166),
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 76% 46%,rgba(255,102,115,0.20),transparent 30%),linear-gradient(110deg,#100709,#160d10)',
          opacity: alpha(frame, 158, 175),
        }}
      />
      <AbsoluteFill
        style={{
          background: v2.cream,
          opacity: alpha(frame, 174.5, 181, 0.9),
        }}
      />
    </AbsoluteFill>
  );
};

export const SharedSignalV2: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  if (second < 51.5 || second > 151) return null;

  let x = 620;
  let y = 310;
  let scale = 1;
  let opacity = 1;
  let label = 'adjustable';
  let tone = v2.blue;

  if (second < 62) {
    const p = interp(second, [51.5, 62], [0, 1]);
    x = 420 + p * 540;
    y = 285 + p * 35;
  } else if (second < 85.6) {
    x = 960;
    y = 320;
  } else if (second < 90.7) {
    x = 960 + Math.sin(frame / 3) * 9;
    y = 320;
    tone = v2.amber;
  } else if (second < 95.7) {
    const p = interp(second, [90.7, 94.1], [0, 1]);
    x = 960;
    y = 320;
    scale = 1 - p;
    opacity = 1 - p;
  } else if (second < 112) {
    const p = interp(second, [95.7, 99], [0, 1]);
    x = 960;
    y = 320;
    label = 'polyester';
    tone = v2.green;
    scale = p;
  } else if (second < 138) {
    const p = interp(second, [112, 138], [0, 1]);
    x = 300 + p * 1320;
    y = 470 + Math.sin(p * Math.PI * 4) * 120;
    label = 'polyester';
    tone = v2.green;
    scale = 0.78 + p * 0.22;
  } else {
    const p = interp(second, [138, 148], [0, 1]);
    x = 1580 - p * 565;
    y = 470 - p * 88;
    label = p > 0.55 ? 'verified target' : 'candidate signal';
    tone = v2.green;
    scale = 1 - p * 0.38;
  }

  return (
    <div
      style={{
        alignItems: 'center',
        background: `${tone}20`,
        border: `1px solid ${tone}aa`,
        borderRadius: 999,
        boxShadow: `0 0 36px ${tone}66`,
        color: v2.cream,
        display: 'flex',
        fontFamily: monoFont,
        fontSize: 16,
        fontWeight: 700,
        gap: 9,
        left: x,
        opacity,
        padding: '11px 16px',
        position: 'absolute',
        scale,
        top: y,
        translate: '-50% -50%',
        zIndex: 85,
      }}
    >
      <span style={{background: tone, borderRadius: 99, height: 8, width: 8}} />
      {label}
    </div>
  );
};
