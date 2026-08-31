import {useCallback, useEffect, useState} from 'react';
import type {Caption} from '@remotion/captions';
import {staticFile, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {beats} from '../storyboard.mjs';
import {interp} from './motion';
import {displayFont, monoFont, v2} from './styles';

export const BrandBugV2: React.FC<{evidence?: boolean}> = ({evidence}) => (
  <>
    <div
      style={{
        alignItems: 'center',
        color: v2.cream,
        display: 'flex',
        fontFamily: displayFont,
        fontSize: 19,
        fontWeight: 750,
        gap: 10,
        left: 58,
        letterSpacing: -0.25,
        position: 'absolute',
        top: 42,
        zIndex: 90,
      }}
    >
      <span style={{background: v2.green, borderRadius: 99, boxShadow: `0 0 18px ${v2.green}`, height: 7, width: 7}} />
      Shopping Copilot
    </div>
    {evidence ? (
      <div
        style={{
          color: v2.green,
          fontFamily: monoFont,
          fontSize: 12,
          letterSpacing: 1.1,
          position: 'absolute',
          right: 58,
          top: 44,
          zIndex: 90,
        }}
      >
        OFFICIAL PUBLIC-SET EVIDENCE
      </div>
    ) : null}
  </>
);

export const CaptionTrackV2: React.FC<{bilingual?: boolean}> = ({bilingual = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const [chineseCaptions, setChineseCaptions] = useState<Caption[] | null>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender('Loading V2 captions'));

  const load = useCallback(async () => {
    try {
      const [englishResponse, chineseResponse] = await Promise.all([
        fetch(staticFile('captions.json')),
        fetch(staticFile('captions.zh-CN.json')),
      ]);
      setCaptions((await englishResponse.json()) as Caption[]);
      setChineseCaptions((await chineseResponse.json()) as Caption[]);
      continueRender(handle);
    } catch (error) {
      cancelRender(error);
    }
  }, [cancelRender, continueRender, handle]);

  useEffect(() => {
    load();
  }, [load]);

  if (!captions || !chineseCaptions) return null;
  const timeMs = (frame / fps) * 1000;
  const caption = captions.find((item) => item.startMs <= timeMs && item.endMs > timeMs);
  const chineseCaption = chineseCaptions.find((item) => item.startMs <= timeMs && item.endMs > timeMs);
  if (!caption) return null;
  const beat = beats[Math.min(35, Math.floor(frame / (fps * 5)))];
  const local = frame % (fps * 5);
  const opacity = interp(local, [0, 9, fps * 5 - 14, fps * 5 - 1], [0, 1, 1, 0]);

  return (
    <div
      style={{
        alignItems: 'center',
        bottom: bilingual ? 34 : 50,
        display: 'flex',
        flexDirection: 'column',
        left: 120,
        opacity,
        position: 'absolute',
        right: 120,
        zIndex: 100,
      }}
    >
      <div
        style={{
          alignItems: 'center',
          backdropFilter: 'blur(12px)',
          background: bilingual ? 'rgba(5, 7, 9, 0.80)' : 'rgba(5, 7, 9, 0.76)',
          border: '1px solid rgba(255,255,255,0.11)',
          borderRadius: 14,
          boxShadow: '0 14px 42px rgba(0,0,0,0.34)',
          display: 'inline-flex',
          maxWidth: 1500,
          padding: bilingual ? '12px 24px 13px' : '13px 24px 14px',
        }}
      >
          <div
            style={{
              background: v2.green,
              height: 32,
              marginRight: 16,
              width: 3,
            }}
          />
          <div
            style={{
              color: v2.cream,
              fontFamily: displayFont,
              display: 'flex',
              flexDirection: 'column',
              fontWeight: 650,
              gap: bilingual ? 5 : 0,
              textAlign: 'center',
              textShadow: '0 2px 18px rgba(0,0,0,0.75)',
            }}
          >
            <div
              style={{
                fontSize: bilingual ? 32 : 38,
                letterSpacing: bilingual ? -0.35 : -0.6,
                lineHeight: 1.12,
              }}
            >
              {caption.text.trim()}
            </div>
            {bilingual && chineseCaption ? (
              <div
                style={{
                  color: '#fffaf0',
                  fontFamily: "'PingFang SC', 'Noto Sans CJK SC', system-ui, sans-serif",
                  fontSize: 27,
                  fontWeight: 600,
                  letterSpacing: 0.15,
                  lineHeight: 1.18,
                }}
              >
                {chineseCaption.text.trim()}
              </div>
            ) : null}
          </div>
      </div>
      {!bilingual ? (
        <div
          style={{
            color: frame / fps >= 174.5 ? v2.greenDeep : v2.green,
            fontFamily: monoFont,
            fontSize: 11,
            letterSpacing: 1,
            marginTop: 7,
            textTransform: 'uppercase',
          }}
        >
          {beat.screenText}
        </div>
      ) : null}
    </div>
  );
};

export const ProgressV2: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const closing = frame / 30 >= 173.8;
  return (
    <div style={{background: closing ? 'rgba(11,13,15,0.16)' : 'rgba(255,255,255,0.08)', bottom: 18, height: 2, left: 58, position: 'absolute', right: 58, zIndex: 110}}>
      <div style={{background: closing ? v2.greenDeep : v2.green, height: 2, width: `${(frame / (durationInFrames - 1)) * 100}%`}} />
    </div>
  );
};
