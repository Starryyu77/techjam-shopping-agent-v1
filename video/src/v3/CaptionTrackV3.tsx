import {useCallback, useEffect, useState} from 'react';
import type {Caption} from '@remotion/captions';
import {staticFile, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';

const serif = "'Source Serif 4 Variable', Georgia, serif";
const chineseSerif = "'Noto Serif SC', serif";

export const CaptionTrackV3: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const [english, setEnglish] = useState<Caption[] | null>(null);
  const [chinese, setChinese] = useState<Caption[] | null>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender('Loading V3 bilingual captions'));

  const load = useCallback(async () => {
    try {
      const [englishResponse, chineseResponse] = await Promise.all([
        fetch(staticFile('v3/captions.en.json')),
        fetch(staticFile('v3/captions.zh-CN.json')),
      ]);
      setEnglish((await englishResponse.json()) as Caption[]);
      setChinese((await chineseResponse.json()) as Caption[]);
      continueRender(handle);
    } catch (error) {
      cancelRender(error);
    }
  }, [cancelRender, continueRender, handle]);

  useEffect(() => {
    load();
  }, [load]);

  if (!english || !chinese) return null;
  const timeMs = (frame / fps) * 1000;
  const englishCaption = english.find((caption) => caption.startMs <= timeMs && caption.endMs > timeMs);
  const chineseCaption = chinese.find((caption) => caption.startMs <= timeMs && caption.endMs > timeMs);
  if (!englishCaption || !chineseCaption) return null;

  const pageFrame = frame % (fps * 5);
  const fadeFrames = 7;
  const opacity = Math.min(
    1,
    pageFrame / fadeFrames,
    (fps * 5 - 1 - pageFrame) / fadeFrames,
  );

  return (
    <div
      style={{
        alignItems: 'center',
        bottom: 42,
        display: 'flex',
        justifyContent: 'center',
        left: 110,
        opacity: Math.max(0, opacity),
        position: 'absolute',
        right: 110,
        zIndex: 300,
      }}
    >
      <div
        style={{
          alignItems: 'center',
          backdropFilter: 'blur(18px)',
          background: 'rgba(24, 20, 18, 0.88)',
          border: '1px solid rgba(255, 249, 236, 0.16)',
          boxShadow: '0 16px 46px rgba(29, 20, 15, 0.20)',
          display: 'flex',
          maxWidth: 1500,
          minHeight: 92,
          padding: '12px 24px 13px',
        }}
      >
        <div
          style={{
            background: '#25f4ee',
            boxShadow: '5px 5px 0 #fe2c55',
            height: 48,
            marginRight: 22,
            width: 4,
          }}
        />
        <div style={{display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center'}}>
          <div
            style={{
              color: '#fff9ec',
              fontFamily: serif,
              fontSize: 32,
              letterSpacing: -0.3,
              lineHeight: 1.06,
            }}
          >
            {englishCaption.text.trim()}
          </div>
          <div
            style={{
              color: '#f4e7d6',
              fontFamily: chineseSerif,
              fontSize: 25,
              fontWeight: 600,
              letterSpacing: 0.2,
              lineHeight: 1.1,
            }}
          >
            {chineseCaption.text.trim()}
          </div>
        </div>
      </div>
    </div>
  );
};
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/source-serif-4/wght-italic.css';
import '@fontsource/noto-serif-sc/chinese-simplified-600.css';
