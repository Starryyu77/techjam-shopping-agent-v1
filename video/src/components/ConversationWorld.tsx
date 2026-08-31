import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {colors, fontFamily, glass, monoFamily, phaseOpacity, clamp} from '../styles';
import {Chip, MessageBubble, TopChrome} from './Primitives';

const ProductCard: React.FC<{
  rank: number;
  title: string;
  active?: boolean;
  opacity?: number;
  offset?: number;
}> = ({rank, title, active, opacity = 1, offset = 0}) => (
  <div
    style={{
      alignItems: 'center',
      background: active ? 'rgba(38, 103, 166, 0.42)' : 'rgba(255,255,255,0.035)',
      border: `1px solid ${active ? 'rgba(97,168,255,0.58)' : colors.border}`,
      borderRadius: 18,
      display: 'flex',
      gap: 18,
      minHeight: 78,
      opacity,
      padding: '13px 17px',
      translate: `${offset}px 0`,
    }}
  >
    <div
      style={{
        alignItems: 'center',
        background: active ? colors.blue : 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        color: active ? '#07101d' : colors.muted,
        display: 'flex',
        fontFamily: monoFamily,
        fontSize: 20,
        fontWeight: 800,
        height: 48,
        justifyContent: 'center',
        width: 48,
      }}
    >
      {rank}
    </div>
    <div style={{color: colors.text, fontFamily, fontSize: 21, fontWeight: 620, lineHeight: 1.2}}>{title}</div>
  </div>
);

export const ConversationWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = phaseOpacity(frame, 1330, 3320, 28);
  const firstMessage = clamp(frame, [1360, 1400], [0, 1]);
  const route = clamp(frame, [1620, 1670], [0, 1]);
  const adjustable = clamp(frame, [1780, 1830], [0, 1]);
  const ask = clamp(frame, [1930, 1980], [0, 1]);
  const overrideMessage = clamp(frame, [2240, 2300], [0, 1]);
  const conflict = clamp(frame, [2460, 2530], [0, 1]);
  const erase = clamp(frame, [2680, 2780], [0, 1]);
  const polyester = clamp(frame, [2830, 2920], [0, 1]);
  const rankOne = clamp(frame, [3010, 3100], [0, 1]);

  return (
    <AbsoluteFill style={{opacity}}>
      <TopChrome section="Owner-approved trace · public_0004" />
      <div
        style={{
          ...glass,
          borderRadius: 32,
          bottom: 150,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          left: 86,
          padding: 30,
          position: 'absolute',
          top: 118,
          width: 770,
        }}
      >
        <div style={{alignItems: 'center', display: 'flex', justifyContent: 'space-between'}}>
          <div style={{color: colors.text, fontFamily, fontSize: 24, fontWeight: 730}}>Conversation</div>
          <div style={{color: colors.muted, fontFamily: monoFamily, fontSize: 15}}>TURN 1 → OVERRIDE</div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 18, opacity: firstMessage}}>
          <MessageBubble accent>
            I need a long-torso camisole with adjustable straps.
          </MessageBubble>
          <MessageBubble opacity={ask}>
            I found ten candidates. Do you have a size requirement?
          </MessageBubble>
        </div>
        <div style={{opacity: overrideMessage, marginTop: 'auto'}}>
          <MessageBubble accent>
            Actually, ignore my earlier preference. What I need is: polyester.
          </MessageBubble>
        </div>
      </div>

      <div
        style={{
          ...glass,
          borderRadius: 32,
          bottom: 150,
          padding: 28,
          position: 'absolute',
          right: 86,
          top: 118,
          width: 890,
        }}
      >
        <div style={{alignItems: 'center', display: 'flex'}}>
          <div>
            <div style={{color: colors.muted, fontFamily: monoFamily, fontSize: 14, letterSpacing: 1.2}}>LIVE STATE</div>
            <div style={{color: colors.text, fontFamily, fontSize: 29, fontWeight: 750, marginTop: 5}}>How the Copilot understands you</div>
          </div>
          <div
            style={{
              background: colors.blueSoft,
              border: `1px solid rgba(97,168,255,0.4)`,
              borderRadius: 999,
              color: colors.blueBright,
              fontFamily: monoFamily,
              fontSize: 17,
              marginLeft: 'auto',
              opacity: route,
              padding: '10px 16px',
            }}
          >
            ROUTE · ITEM
          </div>
        </div>

        <div style={{display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginTop: 25}}>
          <div style={{background: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 18}}>
            <div style={{color: colors.muted, fontFamily: monoFamily, fontSize: 13}}>CATEGORY · RETAINED</div>
            <div style={{color: colors.text, fontFamily, fontSize: 22, fontWeight: 650, marginTop: 8, opacity: route}}>Tanks &amp; Camis</div>
          </div>
          <div style={{background: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 18}}>
            <div style={{color: colors.muted, fontFamily: monoFamily, fontSize: 13}}>TARGET RANK</div>
            <div style={{color: rankOne > 0.5 ? colors.green : colors.amber, fontFamily: monoFamily, fontSize: 32, fontWeight: 780, marginTop: 4}}>
              {rankOne > 0.5 ? '#1' : 'OUTSIDE TOP-10'}
            </div>
          </div>
        </div>

        <div style={{marginTop: 22}}>
          <div style={{color: colors.muted, fontFamily: monoFamily, fontSize: 13, letterSpacing: 1}}>SOFT PREFERENCES · VERSIONED</div>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12}}>
            <div style={{opacity: adjustable * (1 - erase), scale: 1 - erase * 0.08}}>
              <Chip label="feature: adjustable" removed={conflict > 0.5} />
            </div>
            <div style={{opacity: polyester, translate: `${32 * (1 - polyester)}px 0`}}>
              <Chip label="material: polyester" tone="green" />
            </div>
          </div>
          {conflict > 0.02 && erase < 0.95 ? (
            <div style={{color: colors.red, fontFamily: monoFamily, fontSize: 14, marginTop: 12, opacity: conflict * (1 - erase)}}>
              SUPERSEDED VALUE DETECTED · PREPARING BOUNDED REWRITE
            </div>
          ) : null}
        </div>

        <div style={{marginTop: 24}}>
          <div style={{alignItems: 'center', display: 'flex', justifyContent: 'space-between'}}>
            <div style={{color: colors.muted, fontFamily: monoFamily, fontSize: 13}}>RANKED PRODUCTS</div>
            <div style={{color: colors.blueBright, fontFamily: monoFamily, fontSize: 13, opacity: ask}}>NEXT QUESTION · SIZE</div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12}}>
            <ProductCard
              rank={1}
              title={
                rankOne > 0.5
                  ? 'Emmalise · Long Camisole Adjustable Strap'
                  : 'Soft Layering Cami · Cotton Blend'
              }
              active={rankOne > 0.5}
              opacity={0.64 + rankOne * 0.36}
              offset={(1 - rankOne) * 36}
            />
            <ProductCard rank={2} title="Everyday Layering Cami · Stretch Blend" opacity={0.78} />
            <ProductCard rank={3} title="Longline Tank · Soft Jersey" opacity={0.58} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
