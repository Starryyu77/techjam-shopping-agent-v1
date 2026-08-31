import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, interp} from './motion';
import {cardShadow, displayFont, monoFont, v2} from './styles';

const cue = (second: number, at: number, duration = 1) =>
  interp(second, [at, at + duration], [0, 1]);

const ProductSlab: React.FC<{
  rank: number;
  title: string;
  y: number;
  active?: boolean;
  opacity?: number;
  x?: number;
}> = ({rank, title, y, active, opacity = 1, x = 0}) => (
  <div
    style={{
      alignItems: 'center',
      background: active ? 'rgba(84,223,162,0.13)' : 'rgba(243,238,228,0.035)',
      borderBottom: `1px solid ${active ? 'rgba(84,223,162,0.45)' : v2.line}`,
      color: active ? v2.cream : v2.creamMuted,
      display: 'flex',
      fontFamily: displayFont,
      fontSize: 21,
      fontWeight: 620,
      gap: 18,
      height: 74,
      opacity,
      padding: '0 18px',
      position: 'absolute',
      right: 0,
      top: y,
      translate: `${x}px 0`,
      width: 530,
    }}
  >
    <div style={{color: active ? v2.green : v2.creamMuted, fontFamily: monoFont, fontSize: 20, fontWeight: 760, width: 28}}>{rank}</div>
    <div>{title}</div>
  </div>
);

export const ProductStageV2: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  const opacity = alpha(frame, 44.4, 111, 0.8);
  const message = cue(second, 50.6, 0.8);
  const route = cue(second, 55.65, 0.8);
  const adjustable = cue(second, 60.65, 0.8);
  const clarify = cue(second, 65.65, 0.8);
  const miss = cue(second, 70.65, 0.8);
  const override = cue(second, 75.65, 0.9);
  const conflict = cue(second, 85.65, 0.8);
  const erase = cue(second, 90.7, 2.8);
  const polyester = cue(second, 95.7, 1.2);
  const rankOne = cue(second, 100.7, 1.2);

  const focusShift = interp(second, [45, 62, 78, 96, 111], [-80, 0, -35, 25, 90]);
  const stageRotate = interp(second, [45, 78, 111], [-1.8, 0.8, -0.8]);
  const spotlightX = interp(second, [45, 63, 78, 98, 112], [18, 50, 28, 72, 82]);

  return (
    <AbsoluteFill style={{opacity}}>
      <div
        style={{
          inset: '92px 86px 176px',
          position: 'absolute',
          perspective: 1500,
          translate: `${focusShift}px 0`,
        }}
      >
        <div
          style={{
            background: 'linear-gradient(115deg,rgba(243,238,228,0.045),rgba(243,238,228,0.012))',
            border: `1px solid ${v2.line}`,
            boxShadow: cardShadow,
            height: 688,
            left: 25,
            overflow: 'hidden',
            position: 'absolute',
            rotate: `${stageRotate}deg`,
            top: 15,
            width: 1690,
          }}
        >
          <div
            style={{
              background: `radial-gradient(circle at ${spotlightX}% 44%, rgba(243,238,228,0.07), transparent 29%)`,
              inset: 0,
              pointerEvents: 'none',
              position: 'absolute',
            }}
          />
          <div style={{background: v2.green, height: 2, left: 0, opacity: route, position: 'absolute', top: 0, width: `${route * 100}%`}} />
          <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 12, left: 32, letterSpacing: 1.2, position: 'absolute', top: 28}}>
            PUBLIC_0004 · OWNER-APPROVED TRACE
          </div>

          <div
            style={{
              left: 42,
              opacity: message,
              position: 'absolute',
              top: 92,
              translate: `${-32 * (1 - message)}px 0`,
              width: 560,
            }}
          >
            <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 12, letterSpacing: 1}}>SHOPPER</div>
            <div style={{color: v2.cream, fontFamily: displayFont, fontSize: 43, fontWeight: 610, letterSpacing: -1.4, lineHeight: 1.14, marginTop: 12}}>
              Long-torso camisole.
              <br />Adjustable straps.
            </div>
          </div>

          <div
            style={{
              bottom: 68,
              left: 42,
              opacity: override,
              position: 'absolute',
              translate: `${-28 * (1 - override)}px 0`,
              width: 610,
            }}
          >
            <div style={{color: v2.amber, fontFamily: monoFont, fontSize: 12, letterSpacing: 1}}>OVERRIDE · TURN 3</div>
            <div style={{color: v2.cream, fontFamily: displayFont, fontSize: 34, fontWeight: 590, lineHeight: 1.2, marginTop: 10}}>
              “Ignore my earlier preference.
              <br />What I need is polyester.”
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${conflict > 0.4 && erase < 0.7 ? v2.amber : 'rgba(243,238,228,0.12)'}`,
              borderRadius: '50%',
              height: 400,
              left: 650,
              position: 'absolute',
              top: 118,
              width: 400,
            }}
          >
            <div style={{left: 0, position: 'absolute', right: 0, textAlign: 'center', top: 126}}>
              <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 12, letterSpacing: 1}}>VERSIONED STATE</div>
              <div style={{color: v2.cream, fontFamily: displayFont, fontSize: 48, fontWeight: 740, letterSpacing: -2, marginTop: 12}}>Tanks &amp; Camis</div>
              <div style={{color: v2.blue, fontFamily: monoFont, fontSize: 13, marginTop: 17, opacity: route}}>ROUTE · ITEM</div>
            </div>
            <div style={{background: v2.blue, borderRadius: 99, boxShadow: `0 0 24px ${v2.blue}`, height: 9, left: 194, opacity: route, position: 'absolute', top: -5, width: 9}} />
            <div style={{background: polyester > 0.3 ? v2.green : v2.blue, borderRadius: 99, height: 8, left: 194, opacity: Math.max(adjustable * (1 - erase), polyester), position: 'absolute', top: 396, width: 8}} />
          </div>

          <div style={{color: v2.creamMuted, fontFamily: monoFont, fontSize: 12, letterSpacing: 1, position: 'absolute', right: 42, top: 48}}>
            LIVE RANKING
          </div>
          <div style={{position: 'absolute', right: 42, top: 92, width: 530}}>
            <ProductSlab rank={1} title={rankOne > 0.5 ? 'Emmalise · Long Camisole' : 'Soft layering cami · cotton blend'} y={0} active={rankOne > 0.5} x={(1 - rankOne) * 18} />
            <ProductSlab rank={2} title="Everyday stretch layering cami" y={84} opacity={0.78} />
            <ProductSlab rank={3} title="Longline tank · soft jersey" y={168} opacity={0.56} />
          </div>
          <div
            style={{
              bottom: 90,
              color: rankOne > 0.5 ? v2.green : v2.amber,
              fontFamily: monoFont,
              fontSize: 31,
              fontWeight: 760,
              position: 'absolute',
              right: 42,
            }}
          >
            {rankOne > 0.5 ? 'TARGET · RANK #1' : miss > 0.5 ? 'TARGET · OUTSIDE TOP-10' : 'RANKING…'}
          </div>
          <div style={{bottom: 48, color: v2.blue, fontFamily: monoFont, fontSize: 13, opacity: clarify, position: 'absolute', right: 42}}>
            NEXT CLARIFICATION · SIZE
          </div>
          {conflict > 0.1 && erase < 0.95 ? (
            <div
              style={{
                color: v2.amber,
                fontFamily: monoFont,
                fontSize: 12,
                left: 740,
                letterSpacing: 0.8,
                opacity: conflict * (1 - erase),
                position: 'absolute',
                top: 558,
              }}
            >
              SUPERSEDED VALUE · BOUNDED REWRITE
            </div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
