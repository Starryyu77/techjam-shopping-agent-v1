import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/manrope';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/source-serif-4/wght-italic.css';
import {Audio} from '@remotion/media';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import {CaptionTrackV3} from './CaptionTrackV3';
import {v3SceneAssets, v3Style} from './design-v3.mjs';
import {v3Segments} from './storyboard-v3.mjs';

const serif = "'Source Serif 4 Variable', Georgia, serif";
const sans = "'Manrope Variable', 'Helvetica Neue', sans-serif";
const mono = "'JetBrains Mono Variable', monospace";

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const backgroundWindows = [
  {asset: v3SceneAssets.ecommerce, start: 0, end: 41},
  {asset: v3SceneAssets.catalog, start: 39, end: 61},
  {asset: v3SceneAssets.override, start: 59, end: 111},
  {asset: v3SceneAssets.ads, start: 109, end: 151},
  {asset: v3SceneAssets.ecommerce, start: 149, end: 180},
];

const BackgroundV3: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;

  return (
    <AbsoluteFill style={{background: v3Style.background}}>
      {backgroundWindows.map(({asset, start, end}, index) => {
        const entry = start === 0 ? 1 : interpolate(second, [start, start + 1], [0, 1], clamp);
        const exit = end === 180 ? 1 : interpolate(second, [end - 1, end], [1, 0], clamp);
        const opacity = Math.min(entry, exit);
        const layerFrame = frame - start * fps;
        const scale = interpolate(layerFrame, [0, Math.max(1, (end - start) * fps)], [1.025, 1.09], clamp);
        const x = Math.sin(second * 0.085 + index * 0.8) * 13;
        const y = Math.cos(second * 0.071 + index * 0.5) * 7;
        return (
          <Img
            key={`${asset}-${start}`}
            src={staticFile(asset)}
            style={{
              height: '100%',
              objectFit: 'cover',
              opacity,
              position: 'absolute',
              transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
              width: '100%',
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(90deg, rgba(250,244,232,0.98) 0%, rgba(250,244,232,0.88) 37%, rgba(250,244,232,0.12) 66%, rgba(20,14,12,0.12) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(70,45,36,0.018) 0 1px, transparent 1px 4px), radial-gradient(circle at 72% 44%, transparent 0 33%, rgba(41,24,18,0.10) 86%)',
          mixBlendMode: 'multiply',
        }}
      />
    </AbsoluteFill>
  );
};

const Eyebrow: React.FC<{children: React.ReactNode; light?: boolean}> = ({children, light}) => (
  <div
    style={{
      alignItems: 'center',
      color: light ? '#fff9ec' : v3Style.ink,
      display: 'flex',
      fontFamily: mono,
      fontSize: 13,
      gap: 14,
      letterSpacing: 2.0,
      textTransform: 'uppercase',
    }}
  >
    <span style={{background: v3Style.oxblood, height: 2, width: 58}} />
    {children}
  </div>
);

const SerifTitle: React.FC<{
  children: React.ReactNode;
  color?: string;
  italic?: boolean;
  size?: number;
}> = ({children, color = v3Style.ink, italic, size = 92}) => (
  <div
    style={{
      color,
      fontFamily: serif,
      fontSize: size,
      fontStyle: italic ? 'italic' : 'normal',
      letterSpacing: -3.8,
      lineHeight: 0.92,
    }}
  >
    {children}
  </div>
);

const EditorialRail: React.FC<{children: React.ReactNode; width?: number}> = ({children, width = 840}) => (
  <div
    style={{
      bottom: 150,
      left: 78,
      position: 'absolute',
      top: 74,
      width,
      zIndex: 30,
    }}
  >
    {children}
  </div>
);

const enter = (localFrame: number, fps: number, delay = 0) =>
  spring({fps, frame: localFrame - delay, config: {damping: 18, mass: 0.7, stiffness: 120}});

const ProductProblem: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  const p = enter(localFrame, fps);
  const secondHalf = localFrame >= fps * 5;
  return (
    <EditorialRail>
      <Eyebrow>Real shopping · before the search</Eyebrow>
      <div style={{marginTop: 58, opacity: p, transform: `translateY(${(1 - p) * 34}px)`}}>
        <SerifTitle size={94}>One request is<br />never the whole story.</SerifTitle>
      </div>
      <div
        style={{
          borderLeft: `3px solid ${v3Style.oxblood}`,
          fontFamily: serif,
          fontSize: 37,
          fontStyle: 'italic',
          lineHeight: 1.18,
          marginTop: 54,
          maxWidth: 650,
          paddingLeft: 24,
        }}
      >
        “Like the one from that video—<br />lighter, but less formal.”
      </div>
      <div style={{display: 'flex', gap: 22, marginTop: 55}}>
        {['ADD', 'REJECT', 'OVERRIDE'].map((word, index) => (
          <div
            key={word}
            style={{
              borderBottom: `1px solid ${v3Style.ink}`,
              color: index === 2 && secondHalf ? v3Style.oxblood : v3Style.ink,
              fontFamily: mono,
              fontSize: 15,
              letterSpacing: 1.8,
              padding: '0 22px 10px 0',
            }}
          >
            {word}
          </div>
        ))}
      </div>
    </EditorialRail>
  );
};

const ProductReveal: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  const p = enter(localFrame, fps);
  return (
    <EditorialRail width={860}>
      <Eyebrow>Built for TikTok TechJam 2026 · Track 4</Eyebrow>
      <div style={{marginTop: 62, opacity: p, transform: `translateY(${(1 - p) * 40}px)`}}>
        <SerifTitle size={126}>Shopping</SerifTitle>
        <SerifTitle color={v3Style.oxblood} italic size={126}>Copilot</SerifTitle>
      </div>
      <div
        style={{
          borderTop: '1px solid rgba(66,45,38,0.28)',
          display: 'grid',
          fontFamily: sans,
          fontSize: 18,
          gridTemplateColumns: '1fr 1fr',
          lineHeight: 1.35,
          marginTop: 60,
          paddingTop: 22,
          width: 730,
        }}
      >
        <div><b>MODEL</b><br /><span style={{color: v3Style.muted}}>understands intent</span></div>
        <div><b>SYSTEM</b><br /><span style={{color: v3Style.muted}}>remembers · retrieves · ranks</span></div>
      </div>
    </EditorialRail>
  );
};

const QwenBoundary: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  const p = enter(localFrame, fps);
  return (
    <EditorialRail>
      <Eyebrow>Rules-first hybrid intent</Eyebrow>
      <div style={{marginTop: 62}}><SerifTitle size={84}>Understand the language.<br /><i>Protect the ranking.</i></SerifTitle></div>
      <div style={{marginTop: 54, width: 720}}>
        {[
          ['RULE CONFIDENCE', 'LOW'],
          ['LOCAL QWEN', 'INTENT · DIALOGUE ACT'],
          ['RANKING', 'NOT MODEL-GENERATED'],
        ].map(([label, value], index) => (
          <div
            key={label}
            style={{
              alignItems: 'center',
              borderBottom: '1px solid rgba(65,43,35,0.25)',
              display: 'flex',
              fontFamily: mono,
              justifyContent: 'space-between',
              opacity: enter(localFrame, fps, index * 7),
              padding: '16px 0',
              transform: `translateX(${(1 - p) * -18}px)`,
            }}
          >
            <span style={{color: v3Style.muted, fontSize: 12, letterSpacing: 1.5}}>{label}</span>
            <span style={{color: index === 1 ? v3Style.oxblood : v3Style.ink, fontSize: 16, fontWeight: 700}}>{value}</span>
          </div>
        ))}
      </div>
    </EditorialRail>
  );
};

const StructuredIntent: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  return (
    <EditorialRail>
      <Eyebrow>Natural language → bounded intent</Eyebrow>
      <div style={{fontFamily: serif, fontSize: 47, fontStyle: 'italic', lineHeight: 1.16, marginTop: 58, maxWidth: 700}}>
        “Longer for layering.<br />Adjustable straps.”
      </div>
      <div style={{borderTop: '1px solid rgba(65,43,35,0.25)', marginTop: 56, width: 730}}>
        {[
          ['INTENT', 'ITEM'],
          ['CATEGORY', 'TANKS & CAMIS'],
          ['SOFT PREFERENCE', 'ADJUSTABLE'],
        ].map(([label, value], index) => (
          <div
            key={label}
            style={{
              alignItems: 'baseline',
              borderBottom: '1px solid rgba(65,43,35,0.25)',
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              opacity: enter(localFrame, fps, index * 8),
              padding: '17px 0',
            }}
          >
            <span style={{color: v3Style.muted, fontFamily: mono, fontSize: 12, letterSpacing: 1.5}}>{label}</span>
            <span style={{fontFamily: sans, fontSize: 22, fontWeight: 720}}>{value}</span>
          </div>
        ))}
      </div>
    </EditorialRail>
  );
};

const RetrievalScene: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  const progress = interpolate(localFrame, [0, fps * 10], [0, 1], clamp);
  return (
    <EditorialRail>
      <Eyebrow>Versioned state · local retrieval</Eyebrow>
      <div style={{marginTop: 58}}><SerifTitle size={82}>Free text stops<br />at the boundary.</SerifTitle></div>
      <div style={{fontFamily: mono, marginTop: 56, width: 710}}>
        <div style={{alignItems: 'center', display: 'flex', gap: 18}}>
          {[
            ['50,000', 'FROZEN CATALOG'],
            ['800', 'FTS5 RECALL'],
            ['TOP 10', 'RERANKED'],
          ].map(([value, label], index) => (
            <div key={label} style={{flex: 1, opacity: enter(localFrame, fps, index * 9)}}>
              <div style={{color: index === 2 ? v3Style.oxblood : v3Style.ink, fontFamily: serif, fontSize: 47}}>{value}</div>
              <div style={{color: v3Style.muted, fontSize: 10, letterSpacing: 1.5, marginTop: 8}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{background: 'rgba(70,45,36,0.15)', height: 3, marginTop: 38}}>
          <div style={{background: v3Style.oxblood, height: 3, width: `${progress * 100}%`}} />
        </div>
      </div>
    </EditorialRail>
  );
};

const ClarifyScene: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  const showQuestion = localFrame >= fps * 5;
  return (
    <EditorialRail>
      <Eyebrow>Candidate-driven clarification</Eyebrow>
      <div style={{marginTop: 60}}>
        <SerifTitle size={88}>Ask only when<br />the answer matters.</SerifTitle>
      </div>
      <div style={{fontFamily: sans, marginTop: 52, width: 700}}>
        {['MATERIAL', 'SIZE', 'FIT'].map((attribute, index) => {
          const widths = [92, 66, 42];
          return (
            <div key={attribute} style={{alignItems: 'center', display: 'grid', gridTemplateColumns: '120px 1fr', marginBottom: 18}}>
              <span style={{fontFamily: mono, fontSize: 12, letterSpacing: 1.4}}>{attribute}</span>
              <div style={{background: 'rgba(64,44,36,0.14)', height: 9}}>
                <div style={{background: index === 0 ? v3Style.oxblood : '#756962', height: 9, width: `${widths[index]}%`}} />
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          color: v3Style.oxblood,
          fontFamily: serif,
          fontSize: 31,
          fontStyle: 'italic',
          marginTop: 34,
          opacity: showQuestion ? enter(localFrame - fps * 5, fps) : 0,
        }}
      >
        “Which material do you prefer?”
      </div>
    </EditorialRail>
  );
};

const OverrideMessage: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  return (
    <EditorialRail>
      <Eyebrow>Turn 3 · Intent override</Eyebrow>
      <div style={{fontFamily: serif, fontSize: 72, fontStyle: 'italic', lineHeight: 1.02, marginTop: 68}}>
        “Forget adjustable.<br />Use polyester.<br />Keep the longer silhouette.”
      </div>
      <div style={{display: 'flex', gap: 14, marginTop: 54}}>
        {[
          ['REMOVE', v3Style.oxblood],
          ['ADD', v3Style.socialCoral],
          ['RETAIN', v3Style.ink],
        ].map(([action, color], index) => (
          <span
            key={action}
            style={{
              border: `1px solid ${color}`,
              color,
              fontFamily: mono,
              fontSize: 13,
              letterSpacing: 1.5,
              opacity: enter(localFrame, fps, index * 8),
              padding: '11px 16px',
            }}
          >
            {action}
          </span>
        ))}
      </div>
    </EditorialRail>
  );
};

const RewriteScene: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  const p = enter(localFrame, fps);
  return (
    <EditorialRail>
      <Eyebrow>Bounded erase-and-rewrite</Eyebrow>
      <div style={{marginTop: 62}}><SerifTitle size={82}>State version 02</SerifTitle></div>
      <div style={{fontFamily: sans, fontSize: 25, marginTop: 54, width: 720}}>
        <div style={{borderBottom: '1px solid rgba(65,43,35,0.24)', display: 'flex', justifyContent: 'space-between', padding: '18px 0'}}>
          <span style={{color: v3Style.muted}}>SUPERSEDED</span>
          <span style={{color: v3Style.oxblood, textDecoration: 'line-through'}}>adjustable</span>
        </div>
        <div style={{borderBottom: '1px solid rgba(65,43,35,0.24)', display: 'flex', justifyContent: 'space-between', padding: '18px 0'}}>
          <span style={{color: v3Style.muted}}>ADDED</span>
          <span style={{color: v3Style.oxblood, transform: `translateX(${(1 - p) * 28}px)`}}>polyester</span>
        </div>
        <div style={{borderBottom: '1px solid rgba(65,43,35,0.24)', display: 'flex', justifyContent: 'space-between', padding: '18px 0'}}>
          <span style={{color: v3Style.muted}}>RETAINED</span>
          <span>Tanks & Camis</span>
        </div>
      </div>
    </EditorialRail>
  );
};

const RankingScene: React.FC<{localFrame: number; rankOne?: boolean}> = ({localFrame, rankOne}) => {
  const {fps} = useVideoConfig();
  const p = interpolate(localFrame, [0, fps * 9], [0, 1], clamp);
  const items = [
    'Emmalise · Long layering cami',
    'AMVELOP · Adjustable camisole',
    'YITAN · Sleeveless tank',
  ];
  return (
    <EditorialRail>
      <Eyebrow>{rankOne ? 'Verified replay · final ranking' : 'State-driven reranking'}</Eyebrow>
      <div style={{marginTop: 58}}>
        <SerifTitle color={rankOne ? v3Style.oxblood : v3Style.ink} size={rankOne ? 108 : 84}>
          {rankOne ? 'Rank #1' : 'The list moves.'}
        </SerifTitle>
      </div>
      <div style={{fontFamily: sans, marginTop: 50, width: 730}}>
        {items.map((item, index) => {
          const rank = rankOne ? index + 1 : index === 0 ? 3 : index;
          const translate = rankOne && index === 0 ? (1 - p) * 90 : 0;
          return (
            <div
              key={item}
              style={{
                alignItems: 'center',
                background: index === 0 ? 'rgba(141,24,49,0.08)' : 'rgba(255,249,236,0.50)',
                borderBottom: '1px solid rgba(65,43,35,0.20)',
                display: 'grid',
                gridTemplateColumns: '66px 1fr',
                opacity: enter(localFrame, fps, index * 5),
                padding: '16px 18px',
                transform: `translateY(${translate}px)`,
              }}
            >
              <span style={{color: index === 0 ? v3Style.oxblood : v3Style.muted, fontFamily: serif, fontSize: 31}}>{rank}</span>
              <span style={{fontSize: 20, fontWeight: index === 0 ? 720 : 520}}>{item}</span>
            </div>
          );
        })}
      </div>
      {rankOne ? (
        <div style={{color: v3Style.muted, fontFamily: mono, fontSize: 12, letterSpacing: 1.2, marginTop: 28}}>
          CATEGORY MATCH · MATERIAL MATCH · OLD PREFERENCE REMOVED
        </div>
      ) : null}
    </EditorialRail>
  );
};

const MechanismScene: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  return (
    <EditorialRail>
      <Eyebrow>Where intelligence lives</Eyebrow>
      <div style={{marginTop: 58}}><SerifTitle size={82}>The model enters.<br /><i>The state endures.</i></SerifTitle></div>
      <div style={{marginTop: 52, width: 730}}>
        {[
          ['01', 'LANGUAGE', 'Local Qwen · low-confidence intent'],
          ['02', 'STATE', 'Add · remove · retain · trace'],
          ['03', 'PRODUCT', 'FTS5 · rerank · clarify'],
        ].map(([number, label, detail], index) => (
          <div
            key={number}
            style={{
              alignItems: 'baseline',
              borderBottom: '1px solid rgba(65,43,35,0.24)',
              display: 'grid',
              fontFamily: sans,
              gridTemplateColumns: '56px 150px 1fr',
              opacity: enter(localFrame, fps, index * 8),
              padding: '16px 0',
            }}
          >
            <span style={{color: v3Style.oxblood, fontFamily: serif, fontSize: 26}}>{number}</span>
            <span style={{fontFamily: mono, fontSize: 12, letterSpacing: 1.4}}>{label}</span>
            <span style={{color: v3Style.muted, fontSize: 18}}>{detail}</span>
          </div>
        ))}
      </div>
    </EditorialRail>
  );
};

const CommercialTransition: React.FC = () => (
  <EditorialRail>
    <Eyebrow>From core task to real commerce</Eyebrow>
    <div style={{marginTop: 62}}><SerifTitle size={86}>A useful product<br />meets a real market.</SerifTitle></div>
    <div style={{fontFamily: serif, fontSize: 33, fontStyle: 'italic', lineHeight: 1.25, marginTop: 56, maxWidth: 690}}>
      Sponsored supply, advertiser budgets,<br />and relevance constraints need their own lane.
    </div>
  </EditorialRail>
);

const AdsManagerScene: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  return (
    <EditorialRail>
      <Eyebrow>Demo-only advertising layer</Eyebrow>
      <div style={{marginTop: 58}}><SerifTitle size={79}>Auditable by design.</SerifTitle></div>
      <div style={{fontFamily: sans, marginTop: 48, width: 720}}>
        {[
          ['TARGET KEYWORDS', 'layering · camisole · polyester'],
          ['BID', '$1.00'],
          ['DAILY BUDGET', '$50.00'],
          ['BOUNDARY', 'never enters user state or organic ranking'],
        ].map(([label, value], index) => (
          <div key={label} style={{borderBottom: '1px solid rgba(65,43,35,0.22)', display: 'grid', gridTemplateColumns: '190px 1fr', opacity: enter(localFrame, fps, index * 6), padding: '14px 0'}}>
            <span style={{color: v3Style.muted, fontFamily: mono, fontSize: 11, letterSpacing: 1.3}}>{label}</span>
            <span style={{fontSize: 18, fontWeight: 650}}>{value}</span>
          </div>
        ))}
      </div>
    </EditorialRail>
  );
};

const AuctionScene: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  return (
    <EditorialRail>
      <Eyebrow>Relevance before revenue</Eyebrow>
      <div style={{marginTop: 58}}><SerifTitle size={82}>A higher bid<br />cannot buy irrelevance.</SerifTitle></div>
      <div style={{fontFamily: sans, marginTop: 50, width: 730}}>
        <div style={{borderBottom: '1px solid rgba(65,43,35,0.22)', display: 'grid', gridTemplateColumns: '1fr 120px 120px', padding: '16px 0'}}>
          <span style={{fontSize: 20, fontWeight: 700}}>Relevant layering top</span><span>$1.00</span><span style={{color: v3Style.oxblood, fontWeight: 750}}>PASS</span>
        </div>
        <div style={{borderBottom: '1px solid rgba(65,43,35,0.22)', display: 'grid', gridTemplateColumns: '1fr 120px 120px', opacity: enter(localFrame, fps, 7), padding: '16px 0'}}>
          <span style={{fontSize: 20}}>Off-topic watch</span><span>$5.00</span><span style={{color: v3Style.muted, fontWeight: 750}}>BLOCKED</span>
        </div>
        <div style={{color: v3Style.muted, fontFamily: mono, fontSize: 12, letterSpacing: 1.2, marginTop: 26}}>RELEVANCE FLOOR · 0.15 &nbsp;&nbsp; WINNER · BID × RELEVANCE</div>
      </div>
    </EditorialRail>
  );
};

const OrganicInvariantScene: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  const p = enter(localFrame, fps);
  return (
    <EditorialRail>
      <Eyebrow>Sponsored is separate · organic is preserved</Eyebrow>
      <div style={{marginTop: 58}}><SerifTitle size={82}>One labeled slot.<br />Ten unchanged results.</SerifTitle></div>
      <div style={{marginTop: 47, width: 730}}>
        <div style={{background: '#1c1816', color: '#fff9ec', display: 'flex', fontFamily: sans, justifyContent: 'space-between', padding: '14px 18px'}}>
          <span>Sponsored · relevant layering top</span><span style={{color: v3Style.socialCyan}}>DEMO ONLY</span>
        </div>
        <div style={{display: 'flex', gap: 5, marginTop: 22}}>
          {Array.from({length: 10}, (_, index) => (
            <div key={index} style={{background: index === 0 ? v3Style.oxblood : '#645a54', height: 56, opacity: p, width: 63}} />
          ))}
        </div>
        <div style={{color: v3Style.muted, fontFamily: mono, fontSize: 12, letterSpacing: 1.2, marginTop: 18}}>ORGANIC ASIN ORDER · BEFORE = AFTER · VERIFIED</div>
      </div>
    </EditorialRail>
  );
};

const EvaluationScene: React.FC = () => (
  <EditorialRail>
    <Eyebrow>Official public evaluator · N=200</Eyebrow>
    <div style={{marginTop: 48}}>
      <div style={{color: v3Style.oxblood, fontFamily: serif, fontSize: 150, letterSpacing: -7, lineHeight: 0.9}}>0.8665</div>
      <div style={{fontFamily: mono, fontSize: 15, letterSpacing: 1.8, marginTop: 22}}>PUBLIC-SET TECHNICAL SCORE</div>
    </div>
    <div style={{borderTop: '1px solid rgba(65,43,35,0.24)', fontFamily: sans, fontSize: 20, lineHeight: 1.45, marginTop: 48, paddingTop: 24, width: 720}}>
      Private 800-session performance remains unknown.<br />
      <span style={{color: v3Style.muted}}>Model and ads are product extensions outside this evaluation contract.</span>
    </div>
  </EditorialRail>
);

const ExperienceScene: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  return (
    <EditorialRail>
      <Eyebrow>The product experience</Eyebrow>
      <div style={{marginTop: 56}}><SerifTitle size={82}>Not a dashboard.<br /><i>A conversation.</i></SerifTitle></div>
      <div style={{fontFamily: sans, marginTop: 46, width: 720}}>
        {[
          ['WHY THIS CHANGED', 'adjustable removed · polyester added'],
          ['WHY THIS RANKED', 'category + material now match'],
          ['WHAT COMES NEXT', 'continue · revise · inspect'],
        ].map(([label, value], index) => (
          <div key={label} style={{borderBottom: '1px solid rgba(65,43,35,0.22)', opacity: enter(localFrame, fps, index * 8), padding: '14px 0'}}>
            <div style={{color: v3Style.muted, fontFamily: mono, fontSize: 11, letterSpacing: 1.2}}>{label}</div>
            <div style={{fontSize: 19, marginTop: 7}}>{value}</div>
          </div>
        ))}
      </div>
    </EditorialRail>
  );
};

const CloseScene: React.FC<{localFrame: number}> = ({localFrame}) => {
  const {fps} = useVideoConfig();
  const p = enter(localFrame, fps);
  return (
    <EditorialRail width={880}>
      <Eyebrow>Built for TikTok TechJam 2026 · Track 4</Eyebrow>
      <div style={{marginTop: 60, opacity: p}}>
        <SerifTitle size={120}>Shopping</SerifTitle>
        <SerifTitle color={v3Style.oxblood} italic size={120}>Copilot</SerifTitle>
      </div>
      <div style={{fontFamily: serif, fontSize: 34, fontStyle: 'italic', lineHeight: 1.3, marginTop: 50}}>
        Vague intent → explainable recommendations<br />→ transparent advertising
      </div>
      <div style={{fontFamily: mono, fontSize: 13, letterSpacing: 1.2, marginTop: 54}}>
        shopping-copilot-techjam.pages.dev<br />github.com/Starryyu77/techjam-shopping-agent-v1
      </div>
    </EditorialRail>
  );
};

const SegmentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const index = Math.min(17, Math.floor(frame / (fps * 10)));
  const localFrame = frame - index * fps * 10;
  let scene: React.ReactNode;
  switch (index) {
    case 0: scene = <ProductProblem localFrame={localFrame} />; break;
    case 1: scene = <ProductReveal localFrame={localFrame} />; break;
    case 2: scene = <QwenBoundary localFrame={localFrame} />; break;
    case 3: scene = <StructuredIntent localFrame={localFrame} />; break;
    case 4: scene = <RetrievalScene localFrame={localFrame} />; break;
    case 5: scene = <ClarifyScene localFrame={localFrame} />; break;
    case 6: scene = <OverrideMessage localFrame={localFrame} />; break;
    case 7: scene = <RewriteScene localFrame={localFrame} />; break;
    case 8: scene = <RankingScene localFrame={localFrame} />; break;
    case 9: scene = <RankingScene localFrame={localFrame} rankOne />; break;
    case 10: scene = <MechanismScene localFrame={localFrame} />; break;
    case 11: scene = <CommercialTransition />; break;
    case 12: scene = <AdsManagerScene localFrame={localFrame} />; break;
    case 13: scene = <AuctionScene localFrame={localFrame} />; break;
    case 14: scene = <OrganicInvariantScene localFrame={localFrame} />; break;
    case 15: scene = <EvaluationScene />; break;
    case 16: scene = <ExperienceScene localFrame={localFrame} />; break;
    default: scene = <CloseScene localFrame={localFrame} />;
  }
  const opacity = interpolate(localFrame, [0, 8, fps * 10 - 10, fps * 10 - 1], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{opacity}}>{scene}</AbsoluteFill>;
};

const ChromeV3: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const second = frame / fps;
  const segment = v3Segments[Math.min(17, Math.floor(second / 10))];
  return (
    <>
      <div style={{border: '1px solid rgba(57,38,31,0.28)', bottom: 28, left: 38, pointerEvents: 'none', position: 'absolute', right: 38, top: 28, zIndex: 210}} />
      <div style={{color: v3Style.ink, fontFamily: mono, fontSize: 11, letterSpacing: 1.5, position: 'absolute', right: 64, textTransform: 'uppercase', top: 48, zIndex: 220}}>
        {segment.focus.replaceAll('-', ' ')} · {String(Math.floor(second / 60)).padStart(2, '0')}:{String(Math.floor(second % 60)).padStart(2, '0')}
      </div>
      <div style={{background: 'rgba(57,38,31,0.15)', bottom: 18, height: 2, left: 58, position: 'absolute', right: 58, zIndex: 230}}>
        <div style={{background: v3Style.oxblood, height: 2, width: `${(frame / (durationInFrames - 1)) * 100}%`}} />
      </div>
    </>
  );
};

export const ShoppingCopilotFilmV3: React.FC = () => (
  <AbsoluteFill style={{background: v3Style.background, overflow: 'hidden'}}>
    <BackgroundV3 />
    <Audio src={staticFile('v3/audio/music.wav')} volume={0.72} />
    <Audio src={staticFile('v3/audio/narration.wav')} volume={1} />
    <SegmentScene />
    <ChromeV3 />
    <CaptionTrackV3 />
  </AbsoluteFill>
);
