import {Easing, interpolate} from 'remotion';

export const colors = {
  bg: '#070a11',
  panel: 'rgba(17, 23, 35, 0.82)',
  panelStrong: '#121927',
  border: 'rgba(164, 188, 226, 0.16)',
  text: '#f5f8ff',
  muted: '#8f9bb0',
  blue: '#61a8ff',
  blueBright: '#8bc4ff',
  blueSoft: 'rgba(97, 168, 255, 0.14)',
  violet: '#bc8cff',
  violetSoft: 'rgba(188, 140, 255, 0.14)',
  amber: '#f2b84b',
  amberSoft: 'rgba(242, 184, 75, 0.14)',
  red: '#ff6b78',
  redSoft: 'rgba(255, 107, 120, 0.14)',
  green: '#4ed59c',
};

export const fontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';

export const monoFamily =
  '"SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, monospace';

export const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const clamp = (
  frame: number,
  input: number[],
  output: number[],
) =>
  interpolate(frame, input, output, {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const phaseOpacity = (
  frame: number,
  start: number,
  end: number,
  fadeFrames = 18,
) =>
  clamp(
    frame,
    [start, start + fadeFrames, end - fadeFrames, end],
    [0, 1, 1, 0],
  );

export const glass: React.CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.border}`,
  boxShadow:
    '0 28px 90px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.025)',
  backdropFilter: 'blur(28px)',
};
