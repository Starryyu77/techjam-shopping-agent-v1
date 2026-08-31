import {useCallback, useEffect, useState} from 'react';
import type {Caption} from '@remotion/captions';
import {staticFile, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {CaptionBand} from './Primitives';

export const CaptionTrack: React.FC<{kicker: string}> = ({kicker}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender('Loading frozen captions'));

  const load = useCallback(async () => {
    try {
      const response = await fetch(staticFile('captions.json'));
      if (!response.ok) {
        throw new Error(`Captions failed to load: ${response.status}`);
      }
      setCaptions((await response.json()) as Caption[]);
      continueRender(handle);
    } catch (error) {
      cancelRender(error);
    }
  }, [cancelRender, continueRender, handle]);

  useEffect(() => {
    load();
  }, [load]);

  if (!captions) {
    return null;
  }

  const timeMs = (frame / fps) * 1000;
  const current = captions.find(
    (caption) => caption.startMs <= timeMs && caption.endMs > timeMs,
  );
  if (!current) {
    return null;
  }

  return <CaptionBand caption={current.text.trim()} kicker={kicker} />;
};
