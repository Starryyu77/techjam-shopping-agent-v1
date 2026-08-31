import '@fontsource-variable/manrope';
import '@fontsource-variable/jetbrains-mono';
import {Audio} from '@remotion/media';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {cameraStyle} from './motion';
import {BrandBugV2, CaptionTrackV2, ProgressV2} from './ChromeV2';
import {WorldBackdropV2, SharedSignalV2} from './WorldV2';
import {CatalogTunnelV2, OpeningV2} from './OpeningCatalogV2';
import {ProductStageV2} from './ProductStageV2';
import {EvidenceFieldV2, RetrievalTunnelV2} from './MechanismEvidenceV2';
import {CloseoutV2, CommercialFlashV2, DecisionBranchV2} from './DecisionCloseV2';

export const ShoppingCopilotFilmV2: React.FC<{bilingual?: boolean}> = ({bilingual = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  return (
    <AbsoluteFill style={{background: '#0b0d0f', overflow: 'hidden'}}>
      <WorldBackdropV2 />
      <Audio src={staticFile('audio/ambient.wav')} volume={0.56} />
      <Audio src={staticFile('audio/narration.wav')} volume={1} />

      <AbsoluteFill style={cameraStyle(frame, fps)}>
        <OpeningV2 />
        <CatalogTunnelV2 />
        <ProductStageV2 />
        <RetrievalTunnelV2 />
        <EvidenceFieldV2 />
        <DecisionBranchV2 />
        <SharedSignalV2 />
      </AbsoluteFill>

      <CommercialFlashV2 />
      <CloseoutV2 />

      {second < 173.8 && (second < 147 || second >= 160) ? (
        <BrandBugV2 evidence={second >= 30} />
      ) : null}
      <CaptionTrackV2 bilingual={bilingual} />
      <ProgressV2 />
    </AbsoluteFill>
  );
};

export const ShoppingCopilotFilmV2Bilingual: React.FC = () => (
  <ShoppingCopilotFilmV2 bilingual />
);
