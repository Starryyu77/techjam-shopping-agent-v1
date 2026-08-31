import type React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {clamp, colors, ease, fontFamily, glass, monoFamily} from '../styles';

export const TopChrome: React.FC<{section: string; evidence?: boolean}> = ({
  section,
  evidence = true,
}) => (
  <div
    style={{
      alignItems: 'center',
      display: 'flex',
      fontFamily,
      left: 72,
      position: 'absolute',
      right: 72,
      top: 46,
      zIndex: 30,
    }}
  >
    <div
      style={{
        background: colors.blue,
        borderRadius: 99,
        boxShadow: `0 0 28px ${colors.blue}`,
        height: 10,
        marginRight: 14,
        width: 10,
      }}
    />
    <div style={{fontSize: 25, fontWeight: 720, letterSpacing: -0.6}}>
      Shopping Copilot
    </div>
    <div
      style={{
        color: colors.muted,
        fontFamily: monoFamily,
        fontSize: 18,
        letterSpacing: 1.2,
        marginLeft: 24,
        textTransform: 'uppercase',
      }}
    >
      {section}
    </div>
    {evidence ? (
      <div
        style={{
          background: colors.blueSoft,
          border: `1px solid rgba(97,168,255,0.34)`,
          borderRadius: 999,
          color: colors.blueBright,
          fontFamily: monoFamily,
          fontSize: 15,
          letterSpacing: 1.1,
          marginLeft: 'auto',
          padding: '9px 15px',
        }}
      >
        OFFICIAL PUBLIC-SET EVIDENCE
      </div>
    ) : null}
  </div>
);

export const Chip: React.FC<{
  label: string;
  tone?: 'blue' | 'red' | 'violet' | 'amber' | 'green';
  removed?: boolean;
  retained?: boolean;
  style?: React.CSSProperties;
}> = ({label, tone = 'blue', removed, retained, style}) => {
  const toneColor = {
    blue: colors.blue,
    red: colors.red,
    violet: colors.violet,
    amber: colors.amber,
    green: colors.green,
  }[tone];
  return (
    <div
      style={{
        alignItems: 'center',
        background: `${toneColor}18`,
        border: `1px solid ${toneColor}66`,
        borderRadius: 999,
        color: removed ? colors.muted : colors.text,
        display: 'inline-flex',
        fontFamily: monoFamily,
        fontSize: 22,
        fontWeight: 650,
        gap: 10,
        padding: '12px 18px',
        textDecoration: removed ? 'line-through' : 'none',
        ...style,
      }}
    >
      <span style={{color: toneColor}}>{removed ? '−' : retained ? '↳' : '+'}</span>
      {label}
    </div>
  );
};

export const MessageBubble: React.FC<{
  children: React.ReactNode;
  accent?: boolean;
  opacity?: number;
  translateY?: number;
}> = ({children, accent, opacity = 1, translateY = 0}) => (
  <div
    style={{
      ...glass,
      alignSelf: accent ? 'flex-end' : 'flex-start',
      background: accent ? 'rgba(35, 91, 164, 0.78)' : colors.panel,
      borderColor: accent ? 'rgba(97,168,255,0.38)' : colors.border,
      borderRadius: accent ? '28px 28px 7px 28px' : '28px 28px 28px 7px',
      color: colors.text,
      fontFamily,
      fontSize: 31,
      fontWeight: 540,
      lineHeight: 1.38,
      maxWidth: 620,
      opacity,
      padding: '24px 28px',
      translate: `0 ${translateY}px`,
    }}
  >
    {children}
  </div>
);

export const Metric: React.FC<{
  label: string;
  value: string;
  tone?: string;
  large?: boolean;
}> = ({label, value, tone = colors.blueBright, large}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 7}}>
    <div
      style={{
        color: colors.muted,
        fontFamily: monoFamily,
        fontSize: large ? 17 : 14,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
    <div
      style={{
        color: tone,
        fontFamily: monoFamily,
        fontSize: large ? 72 : 38,
        fontWeight: 780,
        letterSpacing: large ? -4 : -1.2,
      }}
    >
      {value}
    </div>
  </div>
);

export const CaptionBand: React.FC<{
  caption: string;
  kicker: string;
}> = ({caption, kicker}) => {
  const frame = useCurrentFrame();
  const local = frame % 150;
  const opacity = interpolate(local, [0, 10, 136, 149], [0, 1, 1, 0], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        alignItems: 'center',
        bottom: 48,
        display: 'flex',
        flexDirection: 'column',
        left: 160,
        opacity,
        position: 'absolute',
        right: 160,
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: 'rgba(4, 7, 13, 0.78)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 18,
          boxShadow: '0 18px 50px rgba(0,0,0,0.34)',
          color: colors.text,
          fontFamily,
          fontSize: 37,
          fontWeight: 620,
          letterSpacing: -0.55,
          lineHeight: 1.25,
          maxWidth: 1440,
          padding: '17px 26px 18px',
          textAlign: 'center',
        }}
      >
        {caption}
      </div>
      <div
        style={{
          color: colors.blueBright,
          fontFamily: monoFamily,
          fontSize: 14,
          letterSpacing: 1.4,
          marginTop: 11,
          textTransform: 'uppercase',
        }}
      >
        {kicker}
      </div>
    </div>
  );
};

export const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({children, delay = 0, style}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        opacity: clamp(frame, [delay, delay + 18], [0, 1]),
        translate: `0 ${clamp(frame, [delay, delay + 18], [22, 0])}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
