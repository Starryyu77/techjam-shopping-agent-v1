import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/manrope';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/source-serif-4/wght-italic.css';
import {Audio} from '@remotion/media';
import {AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

import {v3SubtitlePages} from '../v3/storyboard-v3.mjs';
import {CaptionTrackV3} from '../v3/CaptionTrackV3';

const serif = "'Source Serif 4 Variable', Georgia, serif";
const sans = "'Manrope Variable', 'Helvetica Neue', sans-serif";
const mono = "'JetBrains Mono Variable', monospace";
const palette = {
  background: '#f4edde',
  paper: '#fff9ec',
  ink: '#1c1816',
  oxblood: '#8d1831',
  muted: '#71655e',
  cyan: '#25f4ee',
  coral: '#fe2c55',
  line: 'rgba(57,38,31,0.18)',
};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const interp = (value: number, input: number[], output: number[]) => interpolate(value, input, output, {...clamp, easing: ease});
export const globalStarts = [20, 60, 110];

const Stage: React.FC<{children: React.ReactNode; label: string}> = ({children, label}) => {
  const frame = useCurrentFrame();
  const opacity = interp(frame, [0, 10, 288, 299], [0, 1, 1, 0]);
  return (
  <AbsoluteFill style={{background: palette.background, color: palette.ink, opacity, overflow: 'hidden'}}>
    <AbsoluteFill style={{background: 'radial-gradient(circle at 72% 38%,rgba(141,24,49,.11),transparent 31%),linear-gradient(120deg,rgba(255,249,236,.82),rgba(244,237,222,.62))'}} />
    <div style={{border: `1px solid ${palette.line}`, bottom: 28, left: 38, position: 'absolute', right: 38, top: 28}} />
    <div style={{alignItems: 'center', display: 'flex', fontFamily: sans, fontSize: 18, fontWeight: 760, gap: 10, left: 58, position: 'absolute', top: 43}}>
      <span style={{background: palette.oxblood, borderRadius: 99, height: 7, width: 7}} />Shopping Copilot
    </div>
    <div style={{color: palette.oxblood, fontFamily: mono, fontSize: 11, letterSpacing: 1.2, position: 'absolute', right: 58, top: 46}}>{label}</div>
    {children}
  </AbsoluteFill>
  );
};

const SharedStateToken: React.FC<{label: string; progress: number; tone?: string; x: number; y: number}> = ({label, progress, tone = palette.oxblood, x, y}) => (
  <div style={{alignItems: 'center', background: `${tone}18`, border: `1px solid ${tone}99`, borderRadius: 999, boxShadow: `0 0 28px ${tone}22`, color: palette.ink, display: 'flex', fontFamily: mono, fontSize: 13, fontWeight: 700, gap: 8, left: x, opacity: progress, padding: '10px 14px', position: 'absolute', top: y, transform: `translate(-50%,-50%) scale(${.88 + progress * .12})`}}>
    <span style={{background: tone, borderRadius: 99, height: 7, width: 7}} />{label}
  </div>
);

const Headline: React.FC<{children: React.ReactNode; kicker: string}> = ({children, kicker}) => (
  <div style={{left: 92, position: 'absolute', top: 118}}>
    <div style={{color: palette.oxblood, fontFamily: mono, fontSize: 12, letterSpacing: 1.4}}>{kicker}</div>
    <div style={{fontFamily: serif, fontSize: 74, fontWeight: 650, letterSpacing: -3.7, lineHeight: .98, marginTop: 20}}>{children}</div>
  </div>
);

export const QwenIntentPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  const request = interp(second, [.3, 1.2], [0, 1]);
  const low = interp(second, [1.8, 3.4], [0, 1]);
  const qwen = interp(second, [3.6, 6.0], [0, 1]);
  const lock = interp(second, [6.2, 8.7], [0, 1]);
  return (
    <Stage label="01 · QWEN FALLBACK">
      <Headline kicker="RULES-FIRST HYBRID INTENT">Language is interpreted.<br /><i>Ranking remains bounded.</i></Headline>
      <div style={{left: 102, opacity: request, position: 'absolute', top: 420, transform: `translateX(${(1 - request) * -30}px)`, width: 510}}>
        <div style={{color: palette.muted, fontFamily: mono, fontSize: 11, letterSpacing: 1.2}}>SHOPPER</div>
        <div style={{fontFamily: serif, fontSize: 38, fontStyle: 'italic', lineHeight: 1.15, marginTop: 13}}>“Longer for layering.<br />Adjustable straps.”</div>
      </div>
      <div style={{border: `1px solid ${palette.line}`, borderRadius: '50%', height: 330, left: 690, position: 'absolute', top: 310, width: 330}}>
        <div style={{color: palette.muted, fontFamily: mono, fontSize: 11, left: 0, letterSpacing: 1.1, position: 'absolute', right: 0, textAlign: 'center', top: 102}}>RULE CONFIDENCE</div>
        <div style={{color: palette.oxblood, fontFamily: serif, fontSize: 54, fontWeight: 700, left: 0, opacity: low, position: 'absolute', right: 0, textAlign: 'center', top: 132}}>LOW</div>
        <div style={{background: palette.oxblood, height: 3, left: 54, position: 'absolute', top: 219, width: `${220 * low}px`}} />
      </div>
      <div style={{borderLeft: `1px solid ${palette.line}`, bottom: 202, left: 1110, opacity: qwen, paddingLeft: 42, position: 'absolute', top: 286, transform: `translateX(${(1 - qwen) * 35}px)`, width: 620}}>
        <div style={{color: palette.oxblood, fontFamily: mono, fontSize: 12, letterSpacing: 1.3}}>LOCAL QWEN · FALLBACK</div>
        <div style={{fontFamily: serif, fontSize: 48, fontWeight: 650, marginTop: 22}}>Intent + dialogue action</div>
        <div style={{display: 'flex', gap: 10, marginTop: 36}}>{['ITEM', 'TANKS & CAMIS', 'SOFT · ADJUSTABLE'].map((item) => <span key={item} style={{background: palette.paper, border: `1px solid ${palette.line}`, fontFamily: mono, fontSize: 10, padding: '10px 12px'}}>{item}</span>)}</div>
        <div style={{borderTop: `1px solid ${palette.line}`, color: palette.ink, fontFamily: mono, fontSize: 12, marginTop: 42, opacity: lock, paddingTop: 18}}><span style={{color: palette.oxblood}}>LOCKED</span> · PRODUCTS / SCORES / RANKING</div>
      </div>
    </Stage>
  );
};

export const OverridePreview: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  const message = interp(second, [.3, 1.3], [0, 1]);
  const remove = interp(second, [2.0, 4.0], [0, 1]);
  const add = interp(second, [4.1, 6.2], [0, 1]);
  const retain = interp(second, [6.3, 8.6], [0, 1]);
  return (
    <Stage label="02 · BOUNDED OVERRIDE">
      <Headline kicker="TURN 3 · INTENT OVERRIDE">One sentence.<br /><i>Three state actions.</i></Headline>
      <div style={{left: 100, opacity: message, position: 'absolute', top: 420, transform: `translateX(${(1 - message) * -28}px)`, width: 570}}>
        <div style={{color: palette.muted, fontFamily: mono, fontSize: 11}}>SHOPPER</div>
        <div style={{fontFamily: serif, fontSize: 36, fontStyle: 'italic', lineHeight: 1.17, marginTop: 12}}>“Forget adjustable.<br />Use polyester.<br />Keep the longer silhouette.”</div>
      </div>
      <div style={{border: `1px solid ${palette.line}`, borderRadius: '50%', height: 390, left: 710, position: 'absolute', top: 300, width: 390}}>
        <div style={{fontFamily: mono, fontSize: 11, left: 0, position: 'absolute', right: 0, textAlign: 'center', top: 104}}>VERSIONED STATE · V02</div>
        <div style={{fontFamily: serif, fontSize: 42, fontWeight: 680, left: 0, position: 'absolute', right: 0, textAlign: 'center', top: 137}}>Tanks &amp; Camis</div>
        <SharedStateToken label="adjustable" progress={1 - remove} tone={palette.oxblood} x={195} y={260} />
        <SharedStateToken label="polyester" progress={add} tone={palette.coral} x={195} y={260} />
      </div>
      <div style={{position: 'absolute', right: 110, top: 330, width: 520}}>
        {[
          ['REMOVE', 'adjustable', remove, palette.oxblood],
          ['ADD', 'polyester', add, palette.coral],
          ['RETAIN', 'category · longer silhouette', retain, palette.ink],
        ].map(([action, value, progress, tone]) => <div key={String(action)} style={{alignItems: 'center', borderBottom: `1px solid ${palette.line}`, display: 'grid', gridTemplateColumns: '120px 1fr', opacity: Number(progress), padding: '19px 0', transform: `translateY(${(1 - Number(progress)) * 12}px)`}}><span style={{color: String(tone), fontFamily: mono, fontSize: 11, letterSpacing: 1.2}}>{action}</span><span style={{fontFamily: sans, fontSize: 19, fontWeight: 650}}>{value}</span></div>)}
      </div>
    </Stage>
  );
};

export const PromptEvolutionPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  const failures = interp(second, [.3, 2.2], [0, 1]);
  const contract = interp(second, [2.3, 4.8], [0, 1]);
  const metrics = interp(second, [5.0, 8.7], [0, 1]);
  const rows = [['买鞋', 'VAGUE + SHOES'], ['换成蓝色', 'REMOVE RED + ADD BLUE'], ['我要第二个', 'SELECTED_RANK = 2']];
  const values = [['COMPOSITE', 61.4, 71.9], ['SLOT F1', 27.3, 56.5], ['CLARITY', 72.2, 83.3]] as const;
  return (
    <Stage label="03 · PROMPT EVOLUTION">
      <Headline kicker="OFFLINE LOOP · DEV ONLY">Failures become<br /><i>explicit contracts.</i></Headline>
      <div style={{left: 98, opacity: failures, position: 'absolute', top: 390, width: 470}}>
        <div style={{color: palette.muted, fontFamily: mono, fontSize: 11, letterSpacing: 1.2}}>REPEATED FAILURE</div>
        {rows.map(([input]) => <div key={input} style={{borderBottom: `1px solid ${palette.line}`, fontFamily: serif, fontSize: 24, padding: '14px 0'}}>{input}</div>)}
      </div>
      <div style={{border: `1px solid ${palette.line}`, left: 650, opacity: contract, padding: '24px 28px', position: 'absolute', top: 350, transform: `scale(${.96 + contract * .04})`, width: 480}}>
        <div style={{display: 'flex', fontFamily: mono, fontSize: 11, justifyContent: 'space-between'}}><span style={{color: palette.muted}}>V001</span><span style={{color: palette.oxblood}}>V002</span></div>
        {rows.map(([input, output]) => <div key={input} style={{borderTop: `1px solid ${palette.line}`, display: 'grid', gridTemplateColumns: '120px 1fr', padding: '13px 0'}}><span style={{fontFamily: serif, fontSize: 18}}>{input}</span><span style={{color: palette.oxblood, fontFamily: mono, fontSize: 10}}>→ {output}</span></div>)}
      </div>
      <div style={{opacity: metrics, position: 'absolute', right: 100, top: 310, width: 590}}>
        {values.map(([label, before, after]) => {const value = interp(metrics, [0, 1], [before, after]); return <div key={label} style={{marginBottom: 20}}><div style={{display: 'flex', fontFamily: mono, fontSize: 11, justifyContent: 'space-between'}}><span>{label}</span><span style={{color: palette.oxblood}}>{before.toFixed(1)} → {value.toFixed(1)}</span></div><div style={{background: palette.line, height: 6, marginTop: 9}}><div style={{background: palette.oxblood, height: 6, width: `${value}%`}} /></div></div>;})}
        <div style={{display: 'flex', fontFamily: mono, fontSize: 9, gap: 8, marginTop: 30}}><span style={{background: '#e7d7bf', padding: '8px 10px'}}>DEV · 90 TURNS</span><span style={{background: '#d7eadf', padding: '8px 10px'}}>OPAQUE ACCEPT</span><span style={{background: '#ead5d5', padding: '8px 10px'}}>HELD-OUT · NOT RUN</span></div>
      </div>
    </Stage>
  );
};

const ProductProblemScene: React.FC = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const second = frame / fps;
  const first = interp(second, [.3, 1.2], [0, 1]); const add = interp(second, [2.7, 4.0], [0, 1]); const reject = interp(second, [5.3, 6.8], [0, 1]);
  return <Stage label="01 · REAL SHOPPING"><Headline kicker="BEFORE THE SEARCH">One request is<br /><i>never the whole story.</i></Headline>
    <div style={{left: 100, position: 'absolute', top: 430, width: 720}}>{[
      ['“Like the one from that video.”', first, palette.ink], ['“Lighter—but less formal.”', add, palette.oxblood], ['ADD · REJECT · OVERRIDE', reject, palette.coral],
    ].map(([text, p, tone]) => <div key={String(text)} style={{borderBottom: `1px solid ${palette.line}`, color: String(tone), fontFamily: String(text).startsWith('“') ? serif : mono, fontSize: String(text).startsWith('“') ? 31 : 12, fontStyle: String(text).startsWith('“') ? 'italic' : undefined, opacity: Number(p), padding: '15px 0', transform: `translateX(${(1 - Number(p)) * -25}px)`}}>{text}</div>)}</div>
    <div style={{background: palette.paper, border: `1px solid ${palette.line}`, borderRadius: 28, height: 650, overflow: 'hidden', position: 'absolute', right: 125, top: 118, transform: `rotate(${2 - add * 3}deg)`, width: 390}}><div style={{background: palette.ink, color: palette.paper, display: 'flex', fontFamily: mono, fontSize: 10, justifyContent: 'space-between', padding: '16px 20px'}}><span>SHOP</span><span>LIVE COMMERCE</span></div><div style={{display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr', padding: 12}}>{['LONG CAMI', 'LAYERING', 'SATIN', 'DAILY'].map((label, i) => <div key={label} style={{background: ['#cba996', '#9c7b69', '#e1cfc1', '#7d6b61'][i], height: 235, outline: reject > .5 && i === 3 ? `4px solid ${palette.coral}` : undefined, padding: 12}}><span style={{background: 'rgba(255,255,255,.7)', fontFamily: mono, fontSize: 8, padding: '5px 7px'}}>{label}</span></div>)}</div></div>
  </Stage>;
};

const ProductRevealScene: React.FC = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const second = frame / fps; const title = interp(second, [.4, 2.0], [0, 1]); const roles = interp(second, [3.0, 7.8], [0, 1]);
  return <Stage label="02 · PRODUCT REVEAL"><div style={{left: 104, opacity: title, position: 'absolute', top: 150, transform: `translateY(${(1 - title) * 35}px)`}}><div style={{fontFamily: serif, fontSize: 142, fontWeight: 680, letterSpacing: -8, lineHeight: .86}}>Shopping<br /><i style={{color: palette.oxblood}}>Copilot</i></div><div style={{fontFamily: serif, fontSize: 29, fontStyle: 'italic', marginTop: 42}}>A conversation that becomes state, ranking, and explanation.</div></div>
    <div style={{borderLeft: `1px solid ${palette.line}`, bottom: 210, display: 'grid', gap: 26, gridTemplateColumns: '1fr 1fr', opacity: roles, paddingLeft: 54, position: 'absolute', right: 110, top: 250, width: 750}}>{[['MODEL', 'understands intent'], ['SYSTEM', 'remembers · retrieves · ranks · explains']].map(([a,b], i) => <div key={a} style={{background: i ? 'rgba(37,244,238,.10)' : 'rgba(141,24,49,.08)', borderTop: `3px solid ${i ? palette.cyan : palette.oxblood}`, padding: '28px'}}><div style={{color: i ? palette.muted : palette.oxblood, fontFamily: mono, fontSize: 12}}>{a}</div><div style={{fontFamily: serif, fontSize: 34, fontStyle: 'italic', lineHeight: 1.15, marginTop: 18}}>{b}</div></div>)}</div>
  </Stage>;
};

const StructuredIntentScene: React.FC = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const second = frame / fps; const request = interp(second, [.4, 1.4], [0, 1]);
  const cues = [interp(second, [2.0, 3.6], [0, 1]), interp(second, [3.7, 5.6], [0, 1]), interp(second, [5.7, 8.4], [0, 1])];
  return <Stage label="04 · STRUCTURED INTENT"><Headline kicker="NATURAL LANGUAGE → BOUNDED INTENT">Free text becomes<br /><i>inspectable state.</i></Headline>
    <div style={{fontFamily: serif, fontSize: 35, fontStyle: 'italic', left: 105, lineHeight: 1.18, opacity: request, position: 'absolute', top: 430}}>“Longer for layering.<br />Adjustable straps.”</div>
    <div style={{border: `1px solid ${palette.line}`, position: 'absolute', right: 150, top: 280, width: 760}}>{[['INTENT','ITEM'],['CATEGORY','TANKS & CAMIS'],['SOFT PREFERENCE','ADJUSTABLE']].map(([a,b], i) => <div key={a} style={{alignItems: 'center', borderBottom: i < 2 ? `1px solid ${palette.line}` : undefined, display: 'grid', gridTemplateColumns: '220px 1fr', opacity: cues[i], padding: '27px 30px', transform: `translateX(${(1 - cues[i]) * 22}px)`}}><span style={{color: palette.muted, fontFamily: mono, fontSize: 11}}>{a}</span><span style={{color: i === 2 ? palette.oxblood : palette.ink, fontFamily: serif, fontSize: 30, fontWeight: 650}}>{b}</span></div>)}</div>
  </Stage>;
};

const RetrievalScene: React.FC = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const second = frame / fps; const p = interp(second, [.8, 8.5], [0, 1]);
  const x = interp(p, [0, .33, .66, 1], [340, 760, 1160, 1580]);
  return <Stage label="05 · LOCAL RETRIEVAL"><Headline kicker="VERSIONED STATE · SQLITE FTS5">One signal enters.<br /><i>The world narrows.</i></Headline>
    <div style={{borderTop: `2px solid ${palette.line}`, left: 240, position: 'absolute', right: 240, top: 545}} />
    {['STATE','50,000','800','TOP 10'].map((label, i) => <div key={label} style={{left: [240,650,1060,1470][i], position: 'absolute', textAlign: 'center', top: 470, width: 220}}><div style={{border: `1px solid ${i === 3 ? palette.oxblood : palette.line}`, borderRadius: '50%', height: 150, margin: '0 auto', width: 150}} /><div style={{fontFamily: i ? serif : mono, fontSize: i ? 34 : 12, fontWeight: 680, marginTop: -95}}>{label}</div><div style={{color: palette.muted, fontFamily: mono, fontSize: 9, marginTop: 90}}>{['CONSTRAINTS','FROZEN CATALOG','FTS5 RECALL','RERANKED'][i]}</div></div>)}
    <SharedStateToken label="adjustable · layering" progress={1} x={x} y={545} />
  </Stage>;
};

const ClarifyScene: React.FC = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const second = frame / fps; const bars = interp(second, [.5, 4.8], [0, 1]); const question = interp(second, [5.2, 8.5], [0, 1]);
  return <Stage label="06 · CLARIFICATION"><Headline kicker="CANDIDATE-DRIVEN QUESTION POLICY">Ask only when<br /><i>the answer matters.</i></Headline>
    <div style={{left: 110, position: 'absolute', top: 430, width: 720}}>{[['MATERIAL',92],['SIZE',66],['FIT',42]].map(([a,w], i) => <div key={String(a)} style={{alignItems: 'center', display: 'grid', gridTemplateColumns: '150px 1fr', marginBottom: 23, opacity: bars}}><span style={{fontFamily: mono, fontSize: 11}}>{a}</span><div style={{background: palette.line, height: 8}}><div style={{background: i === 0 ? palette.oxblood : palette.muted, height: 8, width: `${Number(w) * bars}%`}} /></div></div>)}</div>
    <div style={{borderLeft: `4px solid ${palette.oxblood}`, fontFamily: serif, fontSize: 48, fontStyle: 'italic', opacity: question, paddingLeft: 30, position: 'absolute', right: 140, top: 390, transform: `translateY(${(1 - question) * 25}px)`, width: 700}}>“Which material do you prefer?”<div style={{color: palette.muted, fontFamily: mono, fontSize: 10, fontStyle: 'normal', marginTop: 20}}>MOST DISCRIMINATIVE FOLLOW-UP</div></div>
  </Stage>;
};

const RewriteScene: React.FC = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const second = frame / fps; const remove = interp(second, [.8, 3.0], [0, 1]); const add = interp(second, [3.1, 5.7], [0, 1]); const retain = interp(second, [5.8, 8.4], [0, 1]);
  return <Stage label="08 · STATE V02"><Headline kicker="BOUNDED ERASE-AND-REWRITE">History remains.<br /><i>The conflict does not.</i></Headline>
    <div style={{border: `1px solid ${palette.line}`, left: 120, position: 'absolute', top: 405, width: 720}}>{[['SUPERSEDED','adjustable',remove],['ADDED','polyester',add],['RETAINED','Tanks & Camis',retain]].map(([a,b,p], i) => <div key={String(a)} style={{alignItems:'center',borderBottom:i<2?`1px solid ${palette.line}`:undefined,display:'grid',gridTemplateColumns:'220px 1fr',opacity:Number(p),padding:'22px 28px'}}><span style={{color:palette.muted,fontFamily:mono,fontSize:11}}>{a}</span><span style={{color:i===1?palette.coral:i===0?palette.oxblood:palette.ink,fontFamily:serif,fontSize:29,textDecoration:i===0?'line-through':undefined,transform:`translateX(${i===1?(1-Number(p))*25:0}px)`}}>{b}</span></div>)}</div>
    <div style={{border:`1px solid ${palette.line}`,borderRadius:'50%',height:360,position:'absolute',right:240,top:330,width:360}}><div style={{fontFamily:mono,fontSize:11,left:0,position:'absolute',right:0,textAlign:'center',top:108}}>VALID CATEGORY</div><div style={{fontFamily:serif,fontSize:42,fontWeight:680,left:0,position:'absolute',right:0,textAlign:'center',top:145}}>Tanks &amp; Camis</div><SharedStateToken label="polyester" progress={add} tone={palette.coral} x={180} y={260}/></div>
  </Stage>;
};

const ProductRow: React.FC<{rank:number; title:string; y:number; active?:boolean; opacity?:number}> = ({rank,title,y,active,opacity=1}) => <div style={{alignItems:'center',background:active?'rgba(141,24,49,.09)':palette.paper,borderBottom:`1px solid ${palette.line}`,display:'grid',gridTemplateColumns:'75px 1fr',height:86,opacity,padding:'0 22px',position:'absolute',right:0,top:y,width:620}}><span style={{color:active?palette.oxblood:palette.muted,fontFamily:serif,fontSize:38}}>{rank}</span><span style={{fontFamily:sans,fontSize:21,fontWeight:active?750:560}}>{title}</span></div>;

const RerankScene: React.FC = () => {
  const frame=useCurrentFrame();const {fps}=useVideoConfig();const second=frame/fps;const p=interp(second,[1.2,8.3],[0,1]);
  return <Stage label="09 · STATE-DRIVEN RERANK"><Headline kicker="SAME ENGINE · UPDATED STATE">The request changes.<br /><i>The list reorganizes.</i></Headline><div style={{left:110,position:'absolute',top:430,width:530}}><SharedStateToken label="polyester" progress={1} tone={palette.coral} x={190} y={55}/><div style={{color:palette.muted,fontFamily:mono,fontSize:10,marginTop:105}}>UPDATED STATE DRIVES THE SAME RETRIEVAL + RANKING ENGINE</div></div><div style={{height:400,position:'absolute',right:130,top:320,width:620}}><ProductRow rank={Math.round(interp(p,[0,1],[3,1]))} title="Emmalise · Long layering cami" y={interp(p,[0,1],[190,0])} active={p>.55}/><ProductRow rank={Math.round(interp(p,[0,1],[1,2]))} title="Adjustable cotton camisole" y={interp(p,[0,1],[0,100])} opacity={interp(p,[0,1],[1,.45])}/><ProductRow rank={3} title="Daily jersey tank" y={interp(p,[0,1],[100,200])}/></div></Stage>;
};

const RankOneScene: React.FC = () => {
  const frame=useCurrentFrame();const {fps}=useVideoConfig();const second=frame/fps;const target=interp(second,[.7,2.2],[0,1]);const evidence=interp(second,[3,8],[0,1]);
  return <Stage label="10 · VERIFIED RANK #1"><div style={{left:104,opacity:target,position:'absolute',top:170}}><div style={{color:palette.oxblood,fontFamily:serif,fontSize:170,fontWeight:690,letterSpacing:-9,lineHeight:.85}}>Rank #1</div><div style={{fontFamily:serif,fontSize:39,fontStyle:'italic',marginTop:42}}>Emmalise · Long layering cami</div></div><div style={{borderLeft:`1px solid ${palette.line}`,display:'grid',gap:22,gridTemplateColumns:'1fr 1fr',opacity:evidence,paddingLeft:50,position:'absolute',right:130,top:260,width:760}}>{[['CATEGORY','Tanks & Camis'],['MATERIAL','polyester'],['REMOVED','adjustable'],['SOURCE','versioned state']].map(([a,b],i)=><div key={a} style={{borderTop:`3px solid ${i<2?palette.oxblood:palette.line}`,padding:'22px 18px'}}><div style={{color:palette.muted,fontFamily:mono,fontSize:10}}>{a}</div><div style={{fontFamily:serif,fontSize:27,fontStyle:'italic',marginTop:13}}>{b}</div></div>)}</div></Stage>;
};

const MechanismScene: React.FC = () => {
  const frame=useCurrentFrame();const {fps}=useVideoConfig();const second=frame/fps;const p=interp(second,[.8,8.6],[0,1]);const x=interp(p,[0,.33,.66,1],[280,720,1160,1600]);
  return <Stage label="11 · MECHANISM"><Headline kicker="WHERE INTELLIGENCE LIVES">The model enters.<br /><i>The state endures.</i></Headline><div style={{borderTop:`2px solid ${palette.line}`,left:210,position:'absolute',right:210,top:570}}/>{['LANGUAGE','QWEN','STATE','PRODUCT'].map((a,i)=><div key={a} style={{left:[180,620,1060,1500][i],position:'absolute',textAlign:'center',top:470,width:240}}><div style={{border:`1px solid ${i===1?palette.oxblood:palette.line}`,borderRadius:'50%',height:170,margin:'0 auto',width:170}}/><div style={{fontFamily:mono,fontSize:11,marginTop:-95}}>{a}</div><div style={{color:palette.muted,fontFamily:mono,fontSize:9,marginTop:100}}>{['WORDS','LOW-CONFIDENCE INTENT','ADD · REMOVE · RETAIN','FTS5 · RERANK'][i]}</div></div>)}<SharedStateToken label={p<.48?'intent action':'versioned state'} progress={1} x={x} y={570}/></Stage>;
};

const AdsManagerScene: React.FC = () => {const frame=useCurrentFrame();const {fps}=useVideoConfig();const second=frame/fps;const p=interp(second,[.5,8.5],[0,1]);return <Stage label="13 · ADVERTISING TRACK"><Headline kicker="DEMO-ONLY · PHYSICALLY SEPARATE">Commerce enters<br /><i>on its own track.</i></Headline><div style={{border:`1px solid ${palette.line}`,left:110,position:'absolute',top:410,width:720}}>{[['KEYWORDS','layering · polyester'],['BID','$1.00'],['DAILY BUDGET','$50.00']].map(([a,b],i)=><div key={a} style={{borderBottom:i<2?`1px solid ${palette.line}`:undefined,display:'grid',gridTemplateColumns:'220px 1fr',opacity:interp(p,[i*.16,i*.16+.34],[0,1]),padding:'23px 28px'}}><span style={{color:palette.muted,fontFamily:mono,fontSize:11}}>{a}</span><span style={{fontFamily:serif,fontSize:27}}>{b}</span></div>)}</div><div style={{borderLeft:`1px solid ${palette.line}`,fontFamily:mono,fontSize:13,lineHeight:2.3,opacity:interp(second,[5.5,8.5],[0,1]),paddingLeft:45,position:'absolute',right:170,top:390,width:700}}><div style={{color:palette.oxblood}}>NEVER ENTERS</div><div>USER STATE</div><div>ORGANIC RANKING</div><div>OFFICIAL EVALUATION</div></div></Stage>;};

const AuctionScene: React.FC = () => {const frame=useCurrentFrame();const {fps}=useVideoConfig();const second=frame/fps;const gate=interp(second,[1,4],[0,1]);const winner=interp(second,[4.2,8.3],[0,1]);return <Stage label="14 · RELEVANCE AUCTION"><Headline kicker="RELEVANCE BEFORE REVENUE">A higher bid<br /><i>cannot buy irrelevance.</i></Headline><div style={{position:'absolute',right:130,top:340,width:760}}>{[['Relevant layering top','$1.00','PASS',palette.oxblood],['Off-topic watch','$5.00','BLOCKED',palette.muted]].map(([a,b,c,tone],i)=><div key={a} style={{alignItems:'center',background:palette.paper,borderBottom:`1px solid ${palette.line}`,display:'grid',gridTemplateColumns:'1fr 130px 140px',marginBottom:18,opacity:gate,padding:'23px 26px',transform:i===1?`translateX(${winner*120}px)`:undefined}}><span style={{fontFamily:sans,fontSize:20,fontWeight:i?540:720}}>{a}</span><span style={{fontFamily:mono}}>{b}</span><span style={{color:String(tone),fontFamily:mono,fontWeight:750}}>{c}</span></div>)}</div><div style={{bottom:210,color:palette.muted,fontFamily:mono,fontSize:11,opacity:winner,position:'absolute',right:150}}>ELIGIBLE WINNER · BID × RELEVANCE · SPEND RECORDED</div></Stage>;};

const OrganicScene: React.FC = () => {const frame=useCurrentFrame();const {fps}=useVideoConfig();const second=frame/fps;const ad=interp(second,[1,3.5],[0,1]);const organic=interp(second,[3.8,8.3],[0,1]);return <Stage label="15 · ORGANIC INVARIANT"><Headline kicker="SPONSORED IS SEPARATE">One labeled slot.<br /><i>Ten unchanged results.</i></Headline><div style={{position:'absolute',right:130,top:300,width:900}}><div style={{background:palette.ink,color:palette.paper,fontFamily:sans,fontSize:18,opacity:ad,padding:'18px 22px',transform:`translateY(${(1-ad)*35}px)`}}>SPONSORED · Relevant layering top <span style={{color:palette.cyan,float:'right',fontFamily:mono,fontSize:11}}>DEMO ONLY</span></div><div style={{display:'flex',gap:8,marginTop:28}}>{Array.from({length:10},(_,i)=><div key={i} style={{alignItems:'center',background:i===0?palette.oxblood:palette.muted,color:palette.paper,display:'flex',fontFamily:mono,height:72,justifyContent:'center',opacity:organic,width:78}}>{i+1}</div>)}</div><div style={{color:palette.muted,fontFamily:mono,fontSize:11,marginTop:22,opacity:organic}}>ORGANIC ORDER · BEFORE = AFTER · VERIFIED</div></div></Stage>;};

const EvaluationScene: React.FC = () => {const frame=useCurrentFrame();const {fps}=useVideoConfig();const second=frame/fps;const p=interp(second,[.8,6],[0,1]);const score=interp(p,[0,1],[.10671,.8665]);return <Stage label="16 · OFFICIAL PUBLIC"><div style={{left:105,position:'absolute',top:160}}><div style={{color:palette.oxblood,fontFamily:serif,fontSize:170,fontWeight:690,letterSpacing:-9}}>{score.toFixed(4)}</div><div style={{fontFamily:mono,fontSize:13,letterSpacing:1.4}}>TECHNICAL SCORE · 200 PUBLIC SESSIONS</div></div><div style={{borderLeft:`1px solid ${palette.line}`,opacity:interp(second,[4.5,8.5],[0,1]),paddingLeft:46,position:'absolute',right:160,top:270,width:720}}><div style={{fontFamily:serif,fontSize:48,fontStyle:'italic'}}>Private performance<br/>remains unknown.</div><div style={{color:palette.muted,fontFamily:mono,fontSize:11,lineHeight:1.8,marginTop:32}}>QWEN + ADS ARE PRODUCT EXTENSIONS<br/>OUTSIDE THIS EVALUATION CONTRACT</div></div></Stage>;};

const ExperienceScene: React.FC = () => {const frame=useCurrentFrame();const {fps}=useVideoConfig();const second=frame/fps;const p=interp(second,[.5,8.6],[0,1]);return <Stage label="17 · PRODUCT EXPERIENCE"><Headline kicker="NOT A METRIC DASHBOARD">A conversation<br /><i>that explains itself.</i></Headline><div style={{display:'flex',gap:18,left:110,position:'absolute',top:440}}>{[['REVISE','polyester replaces adjustable'],['INSPECT','see exactly what changed'],['CONTINUE','ask, rank, explain again']].map(([a,b],i)=>{const q=interp(p,[i*.17,i*.17+.34],[0,1]);return <div key={a} style={{background:palette.paper,borderTop:`3px solid ${i===0?palette.oxblood:palette.line}`,opacity:q,padding:'25px 24px',transform:`translateY(${(1-q)*30+i*28}px)`,width:500}}><div style={{color:palette.oxblood,fontFamily:mono,fontSize:11}}>{a}</div><div style={{fontFamily:serif,fontSize:29,fontStyle:'italic',marginTop:18}}>{b}</div></div>})}</div></Stage>;};

const CloseScene: React.FC = () => {const frame=useCurrentFrame();const {fps}=useVideoConfig();const second=frame/fps;const p=interp(second,[.5,3],[0,1]);const links=interp(second,[3.3,7.5],[0,1]);return <Stage label="18 · CLOSE"><div style={{left:100,opacity:p,position:'absolute',top:185}}><div style={{fontFamily:serif,fontSize:142,fontWeight:690,letterSpacing:-8,lineHeight:.86}}>Shopping<br/><i style={{color:palette.oxblood}}>Copilot</i></div><div style={{fontFamily:serif,fontSize:30,fontStyle:'italic',lineHeight:1.4,marginTop:45}}>Vague intent → explainable recommendations<br/>→ transparent advertising</div></div><div style={{borderLeft:`1px solid ${palette.line}`,fontFamily:mono,fontSize:15,lineHeight:2.2,opacity:links,paddingLeft:52,position:'absolute',right:150,top:270,width:700}}><div style={{color:palette.oxblood}}>PUBLIC LINKS</div><div>shopping-copilot-techjam.pages.dev</div><div>github.com/Starryyu77/techjam-shopping-agent-v1</div><div style={{color:palette.muted,marginTop:28}}>PUBLIC TS · 0.8665<br/>PRIVATE PERFORMANCE · UNKNOWN</div></div></Stage>;};

const PreviewCaption: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const segment = Math.min(2, Math.floor(frame / (fps * 10)));
  const localSecond = (frame - segment * fps * 10) / fps;
  const globalSecond = globalStarts[segment] + localSecond;
  const page = v3SubtitlePages.find((item) => item.start <= globalSecond && item.end > globalSecond);
  if (!page) return null;
  const pageLocal = (globalSecond - page.start) * fps;
  const opacity = interp(pageLocal, [0, 7, fps * 5 - 8, fps * 5], [0, 1, 1, 0]);
  return <div style={{alignItems: 'center', bottom: 38, display: 'flex', justifyContent: 'center', left: 110, opacity, position: 'absolute', right: 110, zIndex: 100}}><div style={{background: 'rgba(28,24,22,.90)', border: '1px solid rgba(255,249,236,.14)', display: 'flex', maxWidth: 1500, padding: '12px 24px 13px'}}><div style={{background: palette.cyan, boxShadow: `5px 5px 0 ${palette.coral}`, marginRight: 20, width: 4}} /><div style={{textAlign: 'center'}}><div style={{color: palette.paper, fontFamily: serif, fontSize: 31, lineHeight: 1.06}}>{page.en}</div><div style={{color: '#f4e7d6', fontFamily: serif, fontSize: 24, fontWeight: 600, marginTop: 4}}>{page.zh}</div></div></div></div>;
};

export const PurposefulMotionPreview: React.FC = () => {
  const scenes = [QwenIntentPreview, OverridePreview, PromptEvolutionPreview];
  return <AbsoluteFill>{scenes.map((Scene, index) => <Sequence key={globalStarts[index]} from={index * 300} durationInFrames={300}><Scene /><Audio src={staticFile('v3/audio/narration.wav')} trimBefore={globalStarts[index] * 30} volume={1} /><Audio src={staticFile('v3/audio/music.wav')} trimBefore={globalStarts[index] * 30} volume={.72} /></Sequence>)}<PreviewCaption /></AbsoluteFill>;
};

export const fullScenes = [
  ProductProblemScene,
  ProductRevealScene,
  QwenIntentPreview,
  StructuredIntentScene,
  RetrievalScene,
  ClarifyScene,
  OverridePreview,
  RewriteScene,
  RerankScene,
  RankOneScene,
  MechanismScene,
  PromptEvolutionPreview,
  AdsManagerScene,
  AuctionScene,
  OrganicScene,
  EvaluationScene,
  ExperienceScene,
  CloseScene,
];

const FullProgress: React.FC = () => {
  const frame = useCurrentFrame();
  return <div style={{background: palette.line, bottom: 18, height: 2, left: 58, position: 'absolute', right: 58, zIndex: 120}}><div style={{background: palette.oxblood, height: 2, width: `${frame / 5399 * 100}%`}} /></div>;
};

export const PurposefulFilm: React.FC = () => (
  <AbsoluteFill style={{background: palette.background, overflow: 'hidden'}}>
    {fullScenes.map((Scene, index) => <Sequence key={index} from={index * 300} durationInFrames={300}><Scene /></Sequence>)}
    <Audio src={staticFile('v3/audio/music.wav')} volume={.72} />
    <Audio src={staticFile('v3/audio/narration.wav')} volume={1} />
    <CaptionTrackV3 />
    <FullProgress />
  </AbsoluteFill>
);
