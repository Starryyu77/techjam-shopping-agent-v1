import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors} from '../styles';

const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

export const AmbientWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const driftX = interpolate(frame, [0, durationInFrames], [0, -110]);
  const driftY = Math.sin(frame / 180) * 26;
  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 74% 28%, rgba(50,98,160,0.17), transparent 34%), radial-gradient(circle at 22% 72%, rgba(117,69,164,0.11), transparent 33%), #070a11',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '74px 74px',
          inset: -120,
          maskImage: 'radial-gradient(circle at center, black 20%, transparent 82%)',
          opacity: 0.5,
          position: 'absolute',
          translate: `${driftX}px ${driftY}px`,
        }}
      />
      <div
        style={{
          inset: -80,
          position: 'absolute',
          translate: `${driftX * 0.35}px ${driftY * 0.6}px`,
        }}
      >
        {Array.from({length: 150}, (_, index) => {
          const x = seeded(index, 1) * 2020;
          const y = seeded(index, 2) * 1180;
          const size = 2 + seeded(index, 3) * 5;
          const pulse = 0.22 + 0.48 * ((Math.sin(frame / 42 + index) + 1) / 2);
          return (
            <div
              key={index}
              style={{
                background: index % 17 === 0 ? colors.violet : colors.blue,
                borderRadius: 99,
                boxShadow:
                  index % 17 === 0
                    ? `0 0 15px ${colors.violet}`
                    : `0 0 12px ${colors.blue}`,
                height: size,
                left: x,
                opacity: pulse,
                position: 'absolute',
                top: y,
                width: size,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
