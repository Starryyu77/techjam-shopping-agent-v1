import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/manrope';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/source-serif-4/wght-italic.css';
import {Audio} from '@remotion/media';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

import {CaptionTrackV3} from './CaptionTrackV3';
import {v3SceneAssets, v3Style} from './design-v3.mjs';
import {v3Segments} from './storyboard-v3.mjs';

const serif = "'Source Serif 4 Variable', Georgia, serif";
const sans = "'Manrope Variable', 'Helvetica Neue', sans-serif";
const mono = "'JetBrains Mono Variable', monospace";
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const sceneOpacity = (second: number, start: number, end: number, fade = 0.7) => Math.min(
  interpolate(second, [start, start + fade], [0, 1], clamp),
  interpolate(second, [end - fade, end], [1, 0], clamp),
);
const phase = (second: number, start: number, end: number) => interpolate(second, [start, end], [0, 1], clamp);

const Eyebrow: React.FC<{children: React.ReactNode; light?: boolean}> = ({children, light}) => (
  <div style={{alignItems: 'center', color: light ? '#fff9ec' : v3Style.ink, display: 'flex', fontFamily: mono, fontSize: 13, gap: 14, letterSpacing: 2, textTransform: 'uppercase'}}>
    <span style={{background: light ? v3Style.socialCyan : v3Style.oxblood, height: 2, width: 54}} />{children}
  </div>
);
const Title: React.FC<{children: React.ReactNode; size?: number; color?: string; italic?: boolean}> = ({children, size = 76, color = v3Style.ink, italic}) => (
  <div style={{color, fontFamily: serif, fontSize: size, fontStyle: italic ? 'italic' : undefined, letterSpacing: -3.2, lineHeight: 0.94}}>{children}</div>
);
const PaperCard: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{backdropFilter: 'blur(16px)', background: 'rgba(255,250,239,0.91)', border: '1px solid rgba(68,43,34,0.17)', boxShadow: '0 22px 70px rgba(38,23,17,0.14)', ...style}}>{children}</div>
);

const MotionPath: React.FC<{progress: number; path?: string; color?: string; opacity?: number}> = ({progress, path = 'M 120 300 C 450 90, 760 500, 1120 270', color = v3Style.oxblood, opacity = 1}) => {
  const point = (t: number) => {
    const x = interpolate(t, [0, 0.33, 0.66, 1], [120, 460, 760, 1120], clamp);
    const y = interpolate(t, [0, 0.33, 0.66, 1], [300, 185, 425, 270], clamp);
    return {x, y};
  };
  const dot = point(progress);
  return <svg viewBox="0 0 1280 620" style={{height: '100%', left: 0, opacity, overflow: 'visible', position: 'absolute', top: 0, width: '100%'}}>
    <path d={path} fill="none" opacity={0.16} stroke={color} strokeWidth={2} />
    <path d={path} fill="none" pathLength={1000} stroke={color} strokeDasharray={`${progress * 1000} 1000`} strokeLinecap="round" strokeWidth={4} />
    <circle cx={dot.x} cy={dot.y} fill={color} r={9} style={{filter: `drop-shadow(0 0 10px ${color})`}} />
  </svg>;
};

const SharedProductCard: React.FC<{title: string; material: string; rank: number; x: number; y: number; accent?: boolean; opacity?: number}> = ({title, material, rank, x, y, accent, opacity = 1}) => (
  <PaperCard style={{height: 112, left: x, opacity, padding: '16px 18px', position: 'absolute', top: y, width: 370}}>
    <div style={{alignItems: 'center', display: 'grid', gap: 14, gridTemplateColumns: '62px 1fr'}}>
      <div style={{alignItems: 'center', background: accent ? v3Style.oxblood : '#ded1bf', color: accent ? '#fff9ec' : v3Style.ink, display: 'flex', fontFamily: serif, fontSize: 35, height: 78, justifyContent: 'center'}}>{rank}</div>
      <div><div style={{fontFamily: sans, fontSize: 17, fontWeight: 720}}>{title}</div><div style={{color: accent ? v3Style.oxblood : v3Style.muted, fontFamily: mono, fontSize: 10, letterSpacing: 1.1, marginTop: 9}}>{material}</div></div>
    </div>
  </PaperCard>
);

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  const assets = [[v3SceneAssets.ecommerce, 0, 40], [v3SceneAssets.catalog, 38, 62], [v3SceneAssets.override, 58, 121], [v3SceneAssets.ads, 118, 151], [v3SceneAssets.ecommerce, 149, 180]] as const;
  return <AbsoluteFill style={{background: v3Style.background}}>
    {assets.map(([asset, start, end], index) => <Img key={`${asset}-${start}`} src={staticFile(asset)} style={{height: '100%', objectFit: 'cover', opacity: sceneOpacity(second, start, end, 1.4) * 0.38, position: 'absolute', transform: `translate3d(${Math.sin(second * 0.12 + index) * 18}px,${Math.cos(second * 0.1 + index) * 10}px,0) scale(1.08)`, width: '100%'}} />)}
    <AbsoluteFill style={{background: 'linear-gradient(112deg,rgba(248,240,224,.96) 3%,rgba(248,240,224,.78) 47%,rgba(248,240,224,.34) 100%)'}} />
    <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg,rgba(68,43,34,.025) 0 1px,transparent 1px 4px),radial-gradient(circle at 70% 45%,transparent 0 24%,rgba(39,23,17,.12) 92%)'}} />
  </AbsoluteFill>;
};

const CommerceOpening: React.FC<{second: number}> = ({second}) => {
  const opacity = sceneOpacity(second, 0, 20, 1.1); const p = phase(second, 0, 10); const reveal = phase(second, 10, 19);
  return <AbsoluteFill style={{opacity}}>
    <div style={{left: 78, position: 'absolute', top: 70, transform: `translateX(${reveal > 0 ? interpolate(reveal, [0, 1], [-80, 0], clamp) : 0}px)`, width: 700}}>
      <Eyebrow>Real shopping · TikTok TechJam 2026</Eyebrow><div style={{marginTop: 45}}><Title size={reveal > .1 ? 112 : 82}>{reveal > .1 ? 'Shopping' : 'One request is'}<br /><i style={{color: v3Style.oxblood}}>{reveal > .1 ? 'Copilot' : 'never the whole story.'}</i></Title></div>
      <div style={{borderTop: '1px solid rgba(66,45,38,.25)', display: 'flex', fontFamily: mono, fontSize: 12, gap: 34, letterSpacing: 1.3, marginTop: 36, paddingTop: 18, width: 640}}><span>MODEL · UNDERSTAND</span><span>SYSTEM · REMEMBER / RETRIEVE / RANK</span></div>
    </div>
    <PaperCard style={{borderRadius: 34, height: 690, overflow: 'hidden', position: 'absolute', right: 128, top: 98, transform: `rotate(${interpolate(p, [0, 1], [3, -1], clamp)}deg)`, width: 390}}>
      <div style={{background: '#171310', color: '#fff9ec', display: 'flex', fontFamily: mono, fontSize: 10, justifyContent: 'space-between', letterSpacing: 1.2, padding: '17px 20px'}}><span>SHOP</span><span>LIVE COMMERCE</span></div>
      <div style={{display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr', padding: 12}}>{['LONG CAMI', 'LAYERING TOP', 'SATIN TANK', 'DAILY BASIC'].map((label, i) => <div key={label} style={{background: ['#cba996', '#9c7b69', '#e1cfc1', '#7d6b61'][i], height: 190, padding: 13}}><div style={{background: 'rgba(255,255,255,.66)', display: 'inline-block', fontFamily: mono, fontSize: 8, letterSpacing: 1, padding: '5px 7px'}}>{label}</div></div>)}</div>
    </PaperCard>
    <PaperCard style={{borderLeft: `5px solid ${v3Style.socialCoral}`, left: 760, padding: '17px 22px', position: 'absolute', top: interpolate(p, [0, 1], [620, 170], clamp), transform: `rotate(${Math.sin(second) * 1.1}deg)`, width: 520}}><div style={{fontFamily: serif, fontSize: 27, fontStyle: 'italic'}}>“Like that top—longer, lighter, less formal.”</div></PaperCard>
  </AbsoluteFill>;
};

const IntentMechanism: React.FC<{second: number}> = ({second}) => {
  const opacity = sceneOpacity(second, 19, 40, 1.1); const route = phase(second, 20, 30); const structure = phase(second, 30, 39);
  return <AbsoluteFill style={{opacity}}>
    <div style={{left: 76, position: 'absolute', top: 67}}><Eyebrow>Rules-first hybrid intent</Eyebrow><div style={{marginTop: 27}}><Title size={62}>Language moves.<br /><i>Ranking stays bounded.</i></Title></div></div>
    <PaperCard style={{left: 88, padding: 22, position: 'absolute', top: 390, width: 420}}><div style={{fontFamily: serif, fontSize: 29, fontStyle: 'italic'}}>“Longer for layering.<br />Adjustable straps.”</div><div style={{color: v3Style.muted, fontFamily: mono, fontSize: 10, letterSpacing: 1.2, marginTop: 16}}>RAW LANGUAGE</div></PaperCard>
    <MotionPath progress={route} /><div style={{left: 690, position: 'absolute', top: 260}}><div style={{alignItems: 'center', background: route > .45 ? v3Style.ink : '#b9aa99', borderRadius: 90, color: '#fff9ec', display: 'flex', fontFamily: mono, fontSize: 12, height: 170, justifyContent: 'center', letterSpacing: 1.2, textAlign: 'center', width: 170}}>RULE<br />CONFIDENCE<br /><b style={{color: v3Style.socialCoral}}>LOW</b></div><div style={{color: v3Style.muted, fontFamily: mono, fontSize: 10, marginTop: 12, textAlign: 'center'}}>GATE</div></div>
    <div style={{left: 955, position: 'absolute', top: 260, transform: `scale(${.92 + structure * .08})`}}><div style={{alignItems: 'center', background: v3Style.oxblood, border: '10px solid rgba(141,24,49,.13)', borderRadius: 110, boxShadow: '0 0 0 22px rgba(141,24,49,.06)', color: '#fff9ec', display: 'flex', fontFamily: serif, fontSize: 34, height: 180, justifyContent: 'center', textAlign: 'center', width: 180}}>Local<br />Qwen</div><div style={{color: v3Style.muted, fontFamily: mono, fontSize: 10, marginTop: 18, textAlign: 'center'}}>INTENT + DIALOGUE ACT</div></div>
    <div style={{left: interpolate(structure, [0, 1], [850, 1160], clamp), opacity: structure, position: 'absolute', top: 515}}>{['ITEM', 'TANKS & CAMIS', 'ADJUSTABLE · SOFT'].map((text, i) => <div key={text} style={{background: i === 2 ? '#f1d5d2' : '#efe5d6', border: '1px solid rgba(68,43,34,.18)', fontFamily: mono, fontSize: 11, letterSpacing: 1, marginBottom: 9, padding: '10px 14px', transform: `translateX(${i * 34}px)`}}>{text}</div>)}</div>
    <div style={{bottom: 170, color: v3Style.muted, fontFamily: mono, fontSize: 11, left: 90, letterSpacing: 1.2, position: 'absolute'}}>MODEL TRANSLATES LANGUAGE · NEVER GENERATES PRODUCTS OR SCORES</div>
  </AbsoluteFill>;
};

const RetrievalMechanism: React.FC<{second: number}> = ({second}) => {
  const opacity = sceneOpacity(second, 39, 60, 1.1); const flow = phase(second, 40, 50); const clarify = phase(second, 50, 59);
  const dots = Array.from({length: 42}, (_, i) => ({x: 740 + (i % 7) * 68 + Math.sin(i * 1.7) * 12, y: 190 + Math.floor(i / 7) * 72 + Math.cos(i) * 9}));
  return <AbsoluteFill style={{opacity}}>
    <div style={{left: 76, position: 'absolute', top: 67}}><Eyebrow>Versioned state · local retrieval</Eyebrow><div style={{marginTop: 27}}><Title size={62}>Constraints enter.<br /><i>Products reorganize.</i></Title></div></div>
    <PaperCard style={{left: 80, padding: 20, position: 'absolute', top: 365, width: 350}}><div style={{color: v3Style.muted, fontFamily: mono, fontSize: 10, letterSpacing: 1.2}}>STATE · V01</div>{['category / tanks', 'use_case / layering', 'feature / adjustable'].map((t, i) => <div key={t} style={{borderBottom: '1px solid rgba(68,43,34,.15)', color: i === 2 ? v3Style.oxblood : v3Style.ink, fontFamily: mono, fontSize: 13, padding: '13px 0'}}>{t}</div>)}</PaperCard>
    <MotionPath progress={flow} />{dots.map((dot, i) => <div key={i} style={{background: i < interpolate(flow, [0, 1], [0, 42], clamp) ? (i % 6 === 0 ? v3Style.socialCoral : v3Style.ink) : 'rgba(68,43,34,.16)', borderRadius: 20, height: i % 6 === 0 ? 18 : 10, left: dot.x, position: 'absolute', top: dot.y, transform: `scale(${.85 + Math.sin(second * 2 + i) * .12})`, width: i % 6 === 0 ? 18 : 10}} />)}
    <div style={{color: v3Style.muted, fontFamily: mono, fontSize: 11, left: 755, letterSpacing: 1.1, position: 'absolute', top: 665}}>50,000 FROZEN PRODUCTS → 800 RECALL</div>
    <div style={{height: 590, position: 'absolute', right: 86, top: 150, width: 430}}><SharedProductCard accent title="Emmalise · Long cami" material="POLYESTER · LAYERING" rank={1} x={0} y={clarify * -18} opacity={flow} /><SharedProductCard title="AMVELOP · Camisole" material="ADJUSTABLE · COTTON" rank={2} x={34} y={150 + clarify * 28} opacity={flow} /><SharedProductCard title="YITAN · Daily tank" material="BASIC · CASUAL" rank={3} x={18} y={300 + clarify * 12} opacity={flow} /></div>
    <PaperCard style={{bottom: 170, left: 570, opacity: clarify, padding: '15px 22px', position: 'absolute', transform: `translateY(${(1 - clarify) * 35}px)`, width: 540}}><div style={{color: v3Style.oxblood, fontFamily: serif, fontSize: 28, fontStyle: 'italic'}}>“Which material do you prefer?”</div><div style={{color: v3Style.muted, fontFamily: mono, fontSize: 10, letterSpacing: 1.1, marginTop: 8}}>MOST DISCRIMINATIVE FOLLOW-UP</div></PaperCard>
  </AbsoluteFill>;
};

const OverrideMechanism: React.FC<{second: number}> = ({second}) => {
  const opacity = sceneOpacity(second, 59, 101, 1.1); const message = phase(second, 60, 70); const rewrite = phase(second, 70, 80); const rerank = phase(second, 80, 100);
  return <AbsoluteFill style={{opacity}}>
    <div style={{left: 76, position: 'absolute', top: 67}}><Eyebrow>Bounded override · visible state change</Eyebrow><div style={{marginTop: 27}}><Title size={59}>Remove. Add. Retain.<br /><i>Then rerank the same world.</i></Title></div></div>
    <PaperCard style={{left: 80, opacity: message, padding: 22, position: 'absolute', top: 350, transform: `translateX(${(1 - message) * -110}px)`, width: 430}}><div style={{fontFamily: serif, fontSize: 29, fontStyle: 'italic'}}>“Forget adjustable.<br />Use polyester.<br />Keep it longer.”</div></PaperCard><MotionPath progress={rewrite} color={v3Style.socialCoral} />
    <PaperCard style={{left: 660, padding: 20, position: 'absolute', top: 320, width: 360}}><div style={{color: v3Style.muted, fontFamily: mono, fontSize: 10, letterSpacing: 1.2}}>STATE · V02</div><div style={{borderBottom: '1px solid rgba(68,43,34,.16)', display: 'flex', justifyContent: 'space-between', padding: '13px 0'}}><span style={{fontFamily: mono, fontSize: 12}}>feature</span><span style={{color: v3Style.oxblood, fontFamily: mono, textDecoration: rewrite > .35 ? 'line-through' : undefined}}>adjustable</span></div><div style={{borderBottom: '1px solid rgba(68,43,34,.16)', display: 'flex', justifyContent: 'space-between', opacity: rewrite, padding: '13px 0', transform: `translateX(${(1 - rewrite) * 65}px)`}}><span style={{fontFamily: mono, fontSize: 12}}>material</span><span style={{color: v3Style.socialCoral, fontFamily: mono}}>polyester</span></div><div style={{display: 'flex', justifyContent: 'space-between', padding: '13px 0'}}><span style={{fontFamily: mono, fontSize: 12}}>category</span><span style={{fontFamily: mono}}>tanks</span></div></PaperCard>
    <div style={{height: 760, position: 'absolute', right: 78, top: 0, width: 430}}><SharedProductCard title="Emmalise · Long cami" material="POLYESTER · CATEGORY MATCH" rank={Math.round(interpolate(rerank, [0, 1], [3, 1], clamp))} x={0} y={interpolate(rerank, [0, 1], [500, 185], clamp)} accent={rerank > .52} /><SharedProductCard title="AMVELOP · Camisole" material="ADJUSTABLE · CONFLICT" rank={Math.round(interpolate(rerank, [0, 1], [1, 2], clamp))} x={18} y={interpolate(rerank, [0, 1], [190, 340], clamp)} opacity={interpolate(rerank, [0, .9], [1, .55], clamp)} /><SharedProductCard title="YITAN · Daily tank" material="COTTON · PARTIAL MATCH" rank={3} x={8} y={interpolate(rerank, [0, 1], [345, 495], clamp)} /></div>
    <div style={{bottom: 174, color: rerank > .75 ? v3Style.oxblood : v3Style.muted, fontFamily: mono, fontSize: 12, left: 1150, letterSpacing: 1.3, position: 'absolute'}}>TARGET → RANK #1</div>
  </AbsoluteFill>;
};

const MechanismRecap: React.FC<{second: number}> = ({second}) => {
  const opacity = sceneOpacity(second, 99, 111, 1); const p = phase(second, 100, 110); const nodes = [['LANGUAGE', 150], ['QWEN', 505], ['STATE', 860], ['RANKING', 1215]] as const;
  return <AbsoluteFill style={{opacity}}><div style={{left: 76, position: 'absolute', top: 67}}><Eyebrow>Where the intelligence lives</Eyebrow><div style={{marginTop: 27}}><Title size={68}>The model enters.<br /><i>The state endures.</i></Title></div></div><MotionPath progress={p} />{nodes.map(([label, x], i) => <div key={label} style={{alignItems: 'center', background: i === 1 ? v3Style.oxblood : '#fff8e9', border: `1px solid ${i === 1 ? v3Style.oxblood : 'rgba(68,43,34,.22)'}`, borderRadius: 90, color: i === 1 ? '#fff9ec' : v3Style.ink, display: 'flex', fontFamily: mono, fontSize: 12, height: 140, justifyContent: 'center', left: x, letterSpacing: 1.2, position: 'absolute', top: i % 2 ? 330 : 430, transform: `scale(${.9 + Math.min(1, Math.max(0, p * 4 - i)) * .1})`, width: 140}}>{label}</div>)}<div style={{bottom: 178, color: v3Style.muted, fontFamily: mono, fontSize: 11, left: 76, letterSpacing: 1.2, position: 'absolute'}}>ADD · REMOVE · RETAIN · TRACE</div></AbsoluteFill>;
};

const PromptEvolutionScene: React.FC<{second: number}> = ({second}) => {
  const opacity = sceneOpacity(second, 109, 121, 1); const p = phase(second, 110, 120); const metrics = [['DOMAIN', 90, 93.3], ['ACT', 82.2, 84.4], ['CLARITY', 72.2, 83.3], ['SLOT F1', 27.3, 56.5], ['STATE', 10, 22.2], ['SELECT', 91.7, 100]] as const;
  return <AbsoluteFill style={{opacity}}>
    <div style={{left: 76, position: 'absolute', top: 64}}><Eyebrow>Offline prompt evolution · verified boundary</Eyebrow><div style={{marginTop: 24}}><Title size={61}>Repeated failures become<br /><i>explicit contracts.</i></Title></div></div>
    <PaperCard style={{left: 86, padding: 19, position: 'absolute', top: 330, width: 430}}><div style={{display: 'flex', fontFamily: mono, fontSize: 12, justifyContent: 'space-between'}}><span>V001</span><span style={{color: v3Style.oxblood}}>V002</span></div>{[['买鞋', 'VAGUE + SHOES'], ['红色', 'ANSWER · HARD'], ['颜色都可以', 'NO_PREFERENCE'], ['换成蓝色', 'REMOVE RED + ADD BLUE'], ['我要第二个', 'SELECTED_RANK = 2']].map(([input, output], i) => <div key={input} style={{alignItems: 'center', borderTop: '1px solid rgba(68,43,34,.15)', display: 'grid', gridTemplateColumns: '125px 1fr', marginTop: i ? 0 : 15, opacity: interpolate(p, [i * .09, i * .09 + .2], [0, 1], clamp), padding: '10px 0'}}><span style={{fontFamily: serif, fontSize: 18}}>{input}</span><span style={{color: v3Style.oxblood, fontFamily: mono, fontSize: 10, letterSpacing: .7}}>→ {output}</span></div>)}</PaperCard>
    <MotionPath progress={p} color={v3Style.socialCoral} />
    <div style={{display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', left: 785, position: 'absolute', top: 250, width: 770}}>{metrics.map(([label, before, after], i) => {const value = interpolate(p, [.18 + i * .055, .55 + i * .055], [before, after], clamp); return <PaperCard key={label} style={{padding: '15px 17px'}}><div style={{display: 'flex', fontFamily: mono, fontSize: 10, justifyContent: 'space-between', letterSpacing: 1}}><span>{label}</span><span style={{color: v3Style.oxblood}}>{value.toFixed(1)}%</span></div><div style={{background: 'rgba(68,43,34,.12)', height: 7, marginTop: 12}}><div style={{background: v3Style.oxblood, height: 7, width: `${value}%`}} /></div><div style={{color: v3Style.muted, fontFamily: mono, fontSize: 8, marginTop: 7}}>V001 {before.toFixed(1)} → V002 {after.toFixed(1)}</div></PaperCard>;})}</div>
    <div style={{bottom: 168, display: 'flex', fontFamily: mono, fontSize: 10, gap: 18, left: 790, letterSpacing: 1, position: 'absolute'}}><span style={{background: '#e7d7bf', padding: '9px 12px'}}>DEV · 18 SESSIONS / 90 TURNS</span><span style={{background: '#d7eadf', padding: '9px 12px'}}>VALIDATION · OPAQUE ACCEPT</span><span style={{background: '#ead5d5', padding: '9px 12px'}}>HELD-OUT · NOT RUN</span></div>
  </AbsoluteFill>;
};

const AdvertisingMechanism: React.FC<{second: number}> = ({second}) => {
  const opacity = sceneOpacity(second, 119, 151, 1.1); const configure = phase(second, 120, 130); const auction = phase(second, 130, 140); const inject = phase(second, 140, 150);
  return <AbsoluteFill style={{opacity}}>
    <div style={{left: 76, position: 'absolute', top: 64}}><Eyebrow>Separate commercial track · demo only</Eyebrow><div style={{marginTop: 24}}><Title size={61}>Revenue approaches.<br /><i>Relevance guards the door.</i></Title></div></div>
    <PaperCard style={{left: 82, padding: 20, position: 'absolute', top: 350, width: 410}}><div style={{color: v3Style.muted, fontFamily: mono, fontSize: 10, letterSpacing: 1.2}}>ADVERTISER MANAGER</div>{[['KEYWORDS', 'layering · polyester'], ['BID', '$1.00'], ['BUDGET', '$50.00']].map(([a, b], i) => <div key={a} style={{borderTop: '1px solid rgba(68,43,34,.15)', display: 'flex', justifyContent: 'space-between', opacity: interpolate(configure, [i * .16, i * .16 + .25], [0, 1], clamp), padding: '14px 0'}}><span style={{fontFamily: mono, fontSize: 10}}>{a}</span><span style={{fontFamily: sans, fontSize: 16, fontWeight: 720}}>{b}</span></div>)}</PaperCard>
    <MotionPath progress={auction} /><div style={{left: 725, position: 'absolute', top: 300}}><PaperCard style={{opacity: auction, padding: 18, position: 'absolute', width: 410}}><div style={{display: 'grid', fontFamily: sans, gap: 10, gridTemplateColumns: '1fr 80px 85px'}}><b>Layering top</b><span>$1.00</span><span style={{color: v3Style.oxblood}}>PASS</span></div></PaperCard><PaperCard style={{opacity: auction, padding: 18, position: 'absolute', top: 92, transform: `translateX(${inject * 190}px) rotate(${inject * 4}deg)`, width: 410}}><div style={{display: 'grid', fontFamily: sans, gap: 10, gridTemplateColumns: '1fr 80px 85px'}}><span>Off-topic watch</span><span>$5.00</span><span style={{color: v3Style.muted}}>BLOCK</span></div></PaperCard><div style={{color: v3Style.muted, fontFamily: mono, fontSize: 10, letterSpacing: 1.1, position: 'absolute', top: 190, width: 500}}>RELEVANCE FLOOR → BID × RELEVANCE</div></div>
    <div style={{position: 'absolute', right: 80, top: 590}}><div style={{background: '#1b1715', color: '#fff9ec', fontFamily: mono, fontSize: 11, opacity: inject, padding: '13px 18px', transform: `translateY(${(1 - inject) * 50}px)`, width: 520}}>SPONSORED · RELEVANT LAYERING TOP <span style={{color: v3Style.socialCyan, float: 'right'}}>DEMO ONLY</span></div><div style={{display: 'flex', gap: 6, marginTop: 13}}>{Array.from({length: 10}, (_, i) => <div key={i} style={{background: i === 0 ? v3Style.oxblood : '#665b54', height: 45, opacity: inject, width: 46}} />)}</div><div style={{color: v3Style.muted, fontFamily: mono, fontSize: 9, letterSpacing: 1, marginTop: 10}}>ORGANIC ORDER · BEFORE = AFTER</div></div>
  </AbsoluteFill>;
};

const Closeout: React.FC<{second: number}> = ({second}) => {
  const opacity = sceneOpacity(second, 149, 180, 1); const metric = phase(second, 150, 160); const experience = phase(second, 160, 170); const close = phase(second, 170, 179);
  return <AbsoluteFill style={{opacity}}><div style={{left: 76, position: 'absolute', top: 64}}><Eyebrow>Evidence → experience → product</Eyebrow></div><div style={{left: interpolate(metric, [0, 1], [520, 90], clamp), opacity: interpolate(experience, [0, .15], [1, 0], clamp), position: 'absolute', top: 245}}><div style={{color: v3Style.oxblood, fontFamily: serif, fontSize: 168, letterSpacing: -8}}>0.8665</div><div style={{fontFamily: mono, fontSize: 13, letterSpacing: 1.5}}>OFFICIAL PUBLIC · N=200 · PRIVATE UNKNOWN</div></div><div style={{display: 'flex', gap: 18, left: 170, opacity: experience * (1 - close), position: 'absolute', top: 320, transform: `translateY(${(1 - experience) * 90}px)`}}>{[['REVISE', 'polyester replaces adjustable'], ['INSPECT', 'see exactly what changed'], ['CONTINUE', 'ask, rank, explain again']].map(([a, b], i) => <PaperCard key={a} style={{padding: 22, transform: `translateY(${i * 35}px)`, width: 430}}><div style={{color: v3Style.oxblood, fontFamily: mono, fontSize: 11, letterSpacing: 1.3}}>{a}</div><div style={{fontFamily: serif, fontSize: 27, fontStyle: 'italic', marginTop: 18}}>{b}</div></PaperCard>)}</div><div style={{left: 82, opacity: close, position: 'absolute', top: 230, transform: `translateY(${(1 - close) * 55}px)`}}><Title size={132}>Shopping<br /><i style={{color: v3Style.oxblood}}>Copilot</i></Title><div style={{fontFamily: serif, fontSize: 32, fontStyle: 'italic', lineHeight: 1.35, marginTop: 38}}>Vague intent → explainable recommendations<br />→ transparent advertising</div><div style={{fontFamily: mono, fontSize: 12, letterSpacing: 1.1, marginTop: 40}}>shopping-copilot-techjam.pages.dev<br />github.com/Starryyu77/techjam-shopping-agent-v1</div></div></AbsoluteFill>;
};

const MechanismWorld: React.FC = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const second = frame / fps;
  return <AbsoluteFill><CommerceOpening second={second} /><IntentMechanism second={second} /><RetrievalMechanism second={second} /><OverrideMechanism second={second} /><MechanismRecap second={second} /><PromptEvolutionScene second={second} /><AdvertisingMechanism second={second} /><Closeout second={second} /></AbsoluteFill>;
};

const Chrome: React.FC = () => {
  const frame = useCurrentFrame(); const {fps, durationInFrames} = useVideoConfig(); const second = frame / fps; const segment = v3Segments[Math.min(17, Math.floor(second / 10))];
  return <><div style={{border: '1px solid rgba(57,38,31,.24)', bottom: 28, left: 38, pointerEvents: 'none', position: 'absolute', right: 38, top: 28, zIndex: 210}} /><div style={{color: v3Style.ink, fontFamily: mono, fontSize: 10, letterSpacing: 1.4, position: 'absolute', right: 62, textTransform: 'uppercase', top: 47, zIndex: 220}}>{segment.focus.replaceAll('-', ' ')} · {String(Math.floor(second / 60)).padStart(2, '0')}:{String(Math.floor(second % 60)).padStart(2, '0')}</div><div style={{background: 'rgba(57,38,31,.14)', bottom: 18, height: 2, left: 58, position: 'absolute', right: 58, zIndex: 230}}><div style={{background: v3Style.oxblood, height: 2, width: `${(frame / (durationInFrames - 1)) * 100}%`}} /></div></>;
};

export const ShoppingCopilotFilmV3: React.FC = () => <AbsoluteFill style={{background: v3Style.background, overflow: 'hidden'}}><Background /><Audio src={staticFile('v3/audio/music.wav')} volume={0.72} /><Audio src={staticFile('v3/audio/narration.wav')} volume={1} /><MechanismWorld /><Chrome /><CaptionTrackV3 /></AbsoluteFill>;
