import {Easing, interpolate} from 'remotion';
import {cameraKeyframes} from './design.mjs';

export const v2Ease = Easing.bezier(0.22, 1, 0.36, 1);

export const interp = (
  frame: number,
  input: number[],
  output: number[],
) =>
  interpolate(frame, input, output, {
    easing: v2Ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const alpha = (
  frame: number,
  startSecond: number,
  endSecond: number,
  fadeSeconds = 1.25,
  fps = 30,
) =>
  interp(
    frame,
    [
      startSecond * fps,
      (startSecond + fadeSeconds) * fps,
      (endSecond - fadeSeconds) * fps,
      endSecond * fps,
    ],
    [0, 1, 1, 0],
  );

const valueAtCameraTime = (
  second: number,
  key: 'x' | 'y' | 'z' | 'rotate',
) => {
  const seconds = cameraKeyframes.map((keyframe) => keyframe.second);
  const values = cameraKeyframes.map((keyframe) => keyframe[key]);
  return interpolate(second, seconds, values, {
    easing: v2Ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

export const cameraStyle = (frame: number, fps: number): React.CSSProperties => {
  const second = frame / fps;
  const x = valueAtCameraTime(second, 'x');
  const y = valueAtCameraTime(second, 'y');
  const z = valueAtCameraTime(second, 'z');
  const rotate = valueAtCameraTime(second, 'rotate');
  return {
    transform: `translate3d(${x * 0.18}px, ${y * 0.14}px, 0) scale(${1 + z / 8500}) rotate(${rotate * 0.28}deg)`,
    transformOrigin: '50% 48%',
  };
};
