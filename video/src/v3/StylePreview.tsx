import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/manrope';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/source-serif-4/wght-italic.css';
import {AbsoluteFill, Img, staticFile} from 'remotion';

type PreviewKind = 'editorial' | 'socialcommerce' | 'nocturne' | 'documentary';

const backgroundByKind: Record<PreviewKind, string> = {
  editorial: 'style-previews/editorial-atelier.png',
  socialcommerce: 'style-previews/editorial-social-commerce-ecommerce.png',
  nocturne: 'style-previews/nocturne-luxe.png',
  documentary: 'style-previews/cinematic-documentary.png',
};

const styles = {
  editorial: {
    accent: '#7b2030',
    body: '#201a18',
    chrome: 'rgba(247, 240, 226, 0.88)',
    label: '#6d625b',
    line: 'rgba(74, 49, 41, 0.28)',
    serif: "'Source Serif 4 Variable', Georgia, serif",
  },
  socialcommerce: {
    accent: '#8d1831',
    body: '#201a18',
    chrome: 'rgba(248, 242, 229, 0.90)',
    label: '#6d625b',
    line: 'rgba(74, 49, 41, 0.28)',
    serif: "'Source Serif 4 Variable', Georgia, serif",
  },
  nocturne: {
    accent: '#d7ba78',
    body: '#f4ead4',
    chrome: 'rgba(5, 12, 11, 0.74)',
    label: '#b8aa89',
    line: 'rgba(215, 186, 120, 0.32)',
    serif: "'Source Serif 4 Variable', Georgia, serif",
  },
  documentary: {
    accent: '#bc553f',
    body: '#fff7e7',
    chrome: 'rgba(18, 28, 38, 0.76)',
    label: '#d7d0c2',
    line: 'rgba(255, 247, 231, 0.28)',
    serif: "'Source Serif 4 Variable', Georgia, serif",
  },
} as const;

const CopyBlock: React.FC<{kind: PreviewKind}> = ({kind}) => {
  const theme = styles[kind];
  return (
    <div
      style={{
        bottom: 90,
        color: theme.body,
        left: 92,
        position: 'absolute',
        top: 72,
        width: kind === 'documentary' ? 750 : 790,
      }}
    >
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          fontFamily: 'JetBrains Mono Variable, monospace',
          fontSize: 15,
          gap: 14,
          letterSpacing: 2.2,
          textTransform: 'uppercase',
        }}
      >
        <span style={{background: theme.accent, height: 2, width: 58}} />
        Live product demo · Hybrid intent
      </div>

      <div
        style={{
          fontFamily: theme.serif,
          fontSize: kind === 'documentary' ? 104 : 118,
          fontWeight: 500,
          letterSpacing: -4.8,
          lineHeight: 0.86,
          marginTop: 54,
          maxWidth: 760,
        }}
      >
        Shopping
        <br />
        <span style={{color: theme.accent, fontStyle: 'italic'}}>Copilot</span>
      </div>

      <div
        style={{
          borderLeft: `3px solid ${theme.accent}`,
          fontFamily: theme.serif,
          fontSize: 38,
          fontStyle: 'italic',
          lineHeight: 1.18,
          marginTop: 54,
          maxWidth: 680,
          paddingLeft: 24,
        }}
      >
        “Longer for layering. Adjustable straps.”
      </div>

      <div
        style={{
          borderBottom: `1px solid ${theme.line}`,
          borderTop: `1px solid ${theme.line}`,
          display: 'flex',
          gap: 28,
          marginTop: 54,
          padding: '18px 0 17px',
        }}
      >
        {[
          ['INTENT', 'ITEM'],
          ['CATEGORY', 'TANKS & CAMIS'],
          ['SOFT', 'ADJUSTABLE'],
        ].map(([label, value]) => (
          <div key={label} style={{minWidth: label === 'CATEGORY' ? 235 : 120}}>
            <div
              style={{
                color: theme.label,
                fontFamily: 'JetBrains Mono Variable, monospace',
                fontSize: 12,
                letterSpacing: 1.8,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: 'Manrope Variable, sans-serif',
                fontSize: 19,
                fontWeight: 680,
                letterSpacing: -0.25,
                marginTop: 7,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          bottom: 0,
          color: theme.label,
          display: 'flex',
          fontFamily: 'JetBrains Mono Variable, monospace',
          fontSize: 12,
          justifyContent: 'space-between',
          left: 0,
          letterSpacing: 1.7,
          position: 'absolute',
          right: 0,
          textTransform: 'uppercase',
        }}
      >
        <span>Model understands · System remembers</span>
        <span>00:18 / 03:00</span>
      </div>
    </div>
  );
};

export const StylePreview: React.FC<{kind: PreviewKind}> = ({kind}) => {
  const theme = styles[kind];
  return (
    <AbsoluteFill style={{background: '#0b0d0e', overflow: 'hidden'}}>
      <Img
        src={staticFile(backgroundByKind[kind])}
        style={{height: '100%', objectFit: 'cover', width: '100%'}}
      />
      <AbsoluteFill
        style={{
          background:
            kind === 'editorial' || kind === 'socialcommerce'
              ? 'linear-gradient(90deg, rgba(246,239,225,0.98) 0%, rgba(246,239,225,0.90) 36%, rgba(246,239,225,0.18) 67%, transparent 100%)'
              : kind === 'nocturne'
                ? 'linear-gradient(90deg, rgba(3,10,9,0.98) 0%, rgba(3,10,9,0.86) 38%, rgba(3,10,9,0.16) 70%, transparent 100%)'
                : 'linear-gradient(90deg, rgba(12,24,34,0.94) 0%, rgba(12,24,34,0.72) 37%, rgba(12,24,34,0.10) 70%, transparent 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'radial-gradient(circle at 68% 44%, transparent 0 36%, rgba(0,0,0,0.16) 78%), repeating-linear-gradient(0deg, rgba(255,255,255,0.016) 0 1px, transparent 1px 4px)',
          mixBlendMode: kind === 'editorial' || kind === 'socialcommerce' ? 'multiply' : 'screen',
          opacity: kind === 'documentary' ? 0.38 : 0.24,
        }}
      />
      <div
        style={{
          backdropFilter: 'blur(16px)',
          background: theme.chrome,
          bottom: 38,
          left: 38,
          position: 'absolute',
          top: 38,
          width: kind === 'documentary' ? 880 : 910,
        }}
      />
      <CopyBlock kind={kind} />
      {kind === 'socialcommerce' ? (
        <>
          <div
            style={{
              background: '#171717',
              borderLeft: '4px solid #25f4ee',
              boxShadow: '5px 5px 0 #fe2c55',
              color: '#fffaf0',
              fontFamily: 'JetBrains Mono Variable, monospace',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1.5,
              padding: '12px 16px',
              position: 'absolute',
              right: 82,
              top: 74,
            }}
          >
            BUILT FOR TIKTOK TECHJAM 2026 · TRACK 4
          </div>
          <div
            style={{
              alignItems: 'center',
              backdropFilter: 'blur(18px)',
              background: 'rgba(252, 247, 237, 0.88)',
              border: '1px solid rgba(32, 26, 24, 0.18)',
              bottom: 82,
              boxShadow: '0 20px 70px rgba(35, 22, 16, 0.18)',
              color: '#201a18',
              display: 'flex',
              height: 116,
              padding: '0 24px',
              position: 'absolute',
              right: 82,
              width: 490,
            }}
          >
            <div style={{height: 68, marginRight: 18, position: 'relative', width: 68}}>
              <div style={{background: '#25f4ee', height: 46, left: 0, position: 'absolute', top: 3, width: 46}} />
              <div style={{background: '#fe2c55', bottom: 3, height: 46, position: 'absolute', right: 0, width: 46}} />
              <div style={{background: '#171717', inset: 11, position: 'absolute'}} />
            </div>
            <div style={{flex: 1}}>
              <div
                style={{
                  color: '#74655d',
                  fontFamily: 'JetBrains Mono Variable, monospace',
                  fontSize: 11,
                  letterSpacing: 1.6,
                }}
              >
                FROM SHORT VIDEO · SHOP THE LOOK
              </div>
              <div
                style={{
                  fontFamily: "'Source Serif 4 Variable', Georgia, serif",
                  fontSize: 25,
                  lineHeight: 1,
                  marginTop: 11,
                }}
              >
                Long layering top
              </div>
            </div>
            <div
              style={{
                background: '#171717',
                color: '#fffaf0',
                fontFamily: 'Manrope Variable, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                padding: '12px 16px',
              }}
            >
              View product
            </div>
          </div>
        </>
      ) : null}
      <div
        style={{
          border: `1px solid ${theme.line}`,
          bottom: 38,
          left: 38,
          pointerEvents: 'none',
          position: 'absolute',
          right: 38,
          top: 38,
        }}
      />
    </AbsoluteFill>
  );
};

export const EditorialAtelierPreview: React.FC = () => <StylePreview kind="editorial" />;
export const EditorialSocialCommercePreview: React.FC = () => <StylePreview kind="socialcommerce" />;
export const NocturneLuxePreview: React.FC = () => <StylePreview kind="nocturne" />;
export const CinematicDocumentaryPreview: React.FC = () => <StylePreview kind="documentary" />;
